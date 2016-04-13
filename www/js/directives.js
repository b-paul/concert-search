angular.module('concert-search')

.directive('venueView', ['venuesList', function (venuesList) {
  return {
    template: ''
      + '<h4>{{ venue.name }}</h4>'
      + '<two-line-address address="venue.address" on-inspect="onInspect()">'
      + '</two-line-address>'
      + '<p ng-if="venue.rating">Average rating: {{ venue.rating }}</p>'
      + '<p ng-bind-html="venue.attrib"></p>'
      + '<a href="#" ng-click="$event.preventDefault()">'
        + '{{ venue.events.length }} upcoming events'
      + '</a>',
    scope: {
      venue: '=',
      onInspect: '&'
    },
    link: function ($scope, $element, $attr) {
      var lastVenueId;
      var unwatch = $scope.$watch('venue', function () {
        if ($scope.venue && $scope.venue.id !== lastVenueId) {
          lastVenueId = $scope.venue.id;
          $scope.venue = venuesList.getCanonicalVenue($scope.venue);
          if (('dynamic' in $attr) || !$scope.venue.address) {
            $scope.venue.address = 'loading address...';
            venuesList.fetchAddress($scope.venue).catch(function (err) {
              $scope.venue.address = 'Unable to load address';
            });
          }
          if (('dynamic' in $attr) || !$scope.venue.address) {
            venuesList.fetchEvents($scope.venue);
          }
          if (!('dynamic' in $attr)) {
            unwatch();
          }
        }
      });
    }
  };
}])

.directive('eventView', function () {
  return {
    template: ''
      + '<h4>{{ event | eventArtistNames }}</h4>'
      + '<p>{{ event.datetime | date:"EEE, MMM d, yyyy" }}</p>'
      + '<p>{{ event.datetime | date:"h:mm a" }}</p>'
      + '<h5>{{ event.venue.name }}</h5>'
      + '<a target="_blank" ng-href="{{ event.ticket_url }}">Get tickets</a>',
    scope: {
      event: '='
    }
  };
})

.directive('artistView', function () {
  return {
    template: ''
      + '<h4 ng-click="$ctrl.toggleFavorite($ctrl.artist)">'
        + '{{ $ctrl.artist.name }}'
        + '<img ng-src="{{'
          + "'/img/svg/star-' + $ctrl.starType($ctrl.artist) + '.svg'"
        + '}}">'
      + '</h4>',
    scope: {
      artist: '='
    },
    controllerAs: '$ctrl',
    bindToController: true,
    controller: ['favoriteArtists', function (favoriteArtists) {
      this.starType = function (artist) {
        return favoriteArtists.contains(artist.id) ? 'full' : 'empty';
      };

      this.toggleFavorite = function (artist) {
        favoriteArtists.toggle(artist.id);
      };
    }]
  }
})

.directive('twoLineAddress', function () {
  return {
    template: ''
      + '<a href="#" ng-click="inspect(address, $event)">'
        + '<div class="address-line1">{{ line1 }}</div>'
        + '<div class="address-line2">{{ line2 }}</div>'
      + '</a>',
    scope: {
      address: '=',
      onInspect: '&'
    },
    link: function ($scope, $element, $attr) {
      $scope.inspect = function (address, $event) {
        $event && $event.preventDefault();
        $scope.onInspect();
      };

      $scope.$watch('address', function () {
        if (!$scope.address) {
          $scope.line1 = null;
          $scope.line2 = null;
          return;
        }
        var parts = $scope.address.split(', ');
        // discard the last part (country name)
        parts = parts.slice(0, 3);
        $scope.line1 = parts[0]
        $scope.line2 = parts.slice(1).join(', ');
      });
    }
  }
})

.directive('radioGroup', function () {
  return {
    template: ''
      + '<div class="radiogroup"><form>'
        + '<label ng-repeat="opt in $ctrl.options">'
          + '{{ opt }}'
          + '<input type="radio" name="{{ $ctrl.name }}"'
                 + 'value="{{ opt }}"'
                 + 'ng-model="$ctrl.model">'
        + '</label>'
      + '</form></div>',
    scope: {
      name: '@',
      options: '=',
      model: '='
    },
    // controller included solely so that ng-model binds correctly to the
    // outside scope.
    bindToController: true,
    controllerAs: '$ctrl',
    controller: function () {}
  };
})

.directive('map', [
  'maps', 'mapPosition', 'mapSelection',
  function(maps, mapPosition, mapSelection) {
    return {
      restrict: 'E',
      controller: function () {
        var map;
        var waitingForMap = [];
        var ctrl = this;

        ctrl.getMap = function (cb) {
          if (map) {
            cb(map);
          } else {
            waitingForMap.push(cb);
          }
        };

        ctrl.setMap = function(_map_) {
          map = _map_;
          waitingForMap.forEach(function (cb) {
            ctrl.getMap(cb);
          });
          waitingForMap = [];
        };
      },
      link: function ($scope, $element, $attr, $ctrl) {
        var map;
        var initialize = function () {
          var mapOptions = {
            center: new maps.LatLng(mapPosition.lat, mapPosition.lng),
            zoom: mapPosition.zoom,
            mapTypeId: maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false
          };
          map = new maps.Map($element[0], mapOptions);
          mapSelection.setMap(map);
          $scope.$on('$ionicView.enter', function () {
            mapSelection.setMap(map);
          });

          map.addListener('center_changed', function () {
            mapPosition.lat = map.getCenter().lat();
            mapPosition.lng = map.getCenter().lng();
          });

          map.addListener('zoom_changed', function () {
            mapPosition.zoom = map.getZoom();
          });
        };

        if (document.readyState === "complete") {
          initialize();
        } else {
          maps.event.addDomListener(window, 'load', initialize);
        }

        $scope.$watchCollection(
          function () { return mapPosition; },
          function () {
            if (!map) { return; }
            map.setCenter(new maps.LatLng(mapPosition.lat, mapPosition.lng));
            map.setZoom(mapPosition.zoom);
          }
        );
      }
    }
  }]
)

.directive('mapData', [
  'maps', 'mapSelection', 'venuesList',
  function (maps, mapSelection, venuesList) {
    return {
      restrict: 'A',
      scope: {
        mapData: '='
      },
      transclude: true,
      link: function ($scope, $element, $attr, $ctrl, $transclude) {
        var firstElement = function ($dom) {
          for (var i = 0, l = $dom.length; i < l; i++) {
            if ($dom[i] instanceof HTMLElement) {
              return $dom[i];
            }
          }
        };

        // Access the transcluded element(s) and scope
        $transclude($scope.$new(), function (clone, scope) {
          var elt = firstElement(clone);
          // Set the info window to display the transcluded content when opened
          mapSelection.setInfoWindowContent(elt);
          $scope.$on('$ionicView.enter', function () {
            mapSelection.setInfoWindowContent(elt);
          });
          // Listen for selection change and reflect each on scope
          mapSelection.onSelect(function onSelect(selectedMapData) {
            if (mapSelection.getInfoWindowContent() !== elt) {
              return;
            }
            scope.selectedMapData = selectedMapData;
          });
        });

        var markers = [];

        var updateMarkers = function () {
          markers.forEach(function (m) {
            mapSelection.removeMarker(m);
          });
          markers = [];

          $scope.mapData.forEach(function (data) {
            var marker = new maps.Marker({
              position: new maps.LatLng(
                data.latLng.lat, data.latLng.lng
              ),
              title: data.title
            });
            mapSelection.addMarker(marker, data);
            marker.addListener('click', function () {
              $scope.$apply(function () {
                mapSelection.setSelection(data);
              });
            });
            markers.push(marker);
          });
        };

        updateMarkers();
        $scope.$watchCollection('mapData', updateMarkers);
      }
    }
  }
]);
