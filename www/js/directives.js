angular.module('concert-search')

.directive('venueView', ['venuesList', function (venuesList) {
  return {
    template: ''
      + '<h4>{{ venue.name }}</h4>'
      + '<two-line-address address="venue.address" on-inspect="onInspect()">'
      + '</two-line-address>'
      + '<p ng-if="venue.rating">Average rating: {{ venue.rating }}</p>'
      + '<p ng-bind-html="venue.attrib"></p>'
      + '<a ng-href="#/app/venues/{{ venue.id }}/events">'
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
          if (!$scope.venue.address) {
            $scope.venue.address = 'loading address...';
            venuesList.fetchAddress($scope.venue).catch(function (err) {
              $scope.venue.address = 'Unable to load address';
            });
          }
          if (!$scope.venue.events) {
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
      + '<a href="#/app/venues" ng-click="inspect(address)">'
        + '<div class="address-line1">{{ line1 }}</div>'
        + '<div class="address-line2">{{ line2 }}</div>'
      + '</a>',
    scope: {
      address: '=',
      onInspect: '&'
    },
    link: function ($scope, $element, $attr) {
      $scope.inspect = function (address) {
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

.directive('viewstyleSelector', function () {
  return {
    template: ''
      + '<form class="radiogroup">'
        + '<label for="{{ id }}" ng-repeat="opt in [\'map\', \'list\']">'
          + '{{ opt }}'
          + '<input type="radio" name="style" id="{{ id }}"'
                 + 'value="{{ opt }}"'
                 + 'ng-model="viewStyle.style">'
        + '</label>'
      + '</form>',
    scope: {
      id: '@',
      viewStyle: '='
    }
  };
})

.directive('mapView', [
  'maps', 'mapPosition', 'debounce', '$window', '$rootScope',
  function(maps, mapPosition, debounce, $window, $rootScope) {
    var doc = $window.document;
    return {
      restrict: 'E',
      scope: {
        mapData: '=',
      },
      transclude: true,
      link: function ($scope, $element, $attr, $ctrl, $transclude) {
        var map, infoWindow, infoScope;

        var markers = [];
        var markersDict = {};

        var getKey = function (data) {
          return data.id;
        };

        var showInfo = function (data) {
          mapPosition.info = data;
          var dataKey = getKey(data);
          var marker = markersDict[dataKey];
          if (!data || !marker) {
            mapPosition.info = null;
            return infoWindow.close();
          }
          infoScope.selectedMapData = data;
          infoWindow.open(map, marker);
        };

        var unshowInfo = function (data) {
          mapPosition.info = null;
        };

        var setMarkers = function () {
          markers.forEach(function (marker) { marker.setMap(null); });
          markersDict = {};
          markers = $scope.mapData.map(function (data) {
            var dataKey = getKey(data);
            var marker = new maps.Marker({
              position: new maps.LatLng(data.latitude, data.longitude),
              title: data.title
            });
            marker.setMap(map);
            markersDict[dataKey] = marker;
            marker.addListener('click', function () {
              $scope.$apply(showInfo.bind(null, data));
            });
            return marker;
          });
          mapPosition.info && showInfo(mapPosition.info);
        };

        var initialize = function () {
          var latitude = mapPosition.latitude;
          var longitude = mapPosition.longitude;
          map = new maps.Map(firstElement($element), {
            center: new maps.LatLng(latitude, longitude),
            zoom: mapPosition.zoom,
            mapTypeId: maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false
          });

          $scope.$watchCollection('mapData', setMarkers);


          map.addListener('center_changed', function () {
            var center = map.getCenter();
            mapPosition.latitude = center.lat();
            mapPosition.longitude = center.lng();

            mapPosition.emit('change');
          });

          map.addListener('zoom_changed', function () {
            mapPosition.zoom = map.getZoom();

            mapPosition.emit('change');
          });

          mapPosition.on('change', debounce(function () {
            var latitude = mapPosition.latitude;
            var longitude = mapPosition.longitude;
            var zoom = mapPosition.zoom;

            var currentCenter = map.getCenter();
            var currentLat = currentCenter.lat();
            var currentLng = currentCenter.lng();
            var currentZoom = map.getZoom();

            var positionChange
              = currentLat !== latitude
              || currentLng !== longitude
              || currentZoom !== zoom;

            if (positionChange) {
              map.setCenter(new maps.LatLng(latitude, longitude));
              map.setZoom(mapPosition.zoom);
            }

            mapPosition.info && showInfo(mapPosition.info);
          }));
        };

        var firstElement = function ($dom) {
          for (var i = 0, l = $dom.length; i < l; i++) {
            if ($dom[i] instanceof HTMLElement) {
              return $dom[i];
            }
          }
        };

        // Access the transcluded element(s) and scope
        $transclude(function (tClone, tScope) {
          var elt = firstElement(tClone);
          infoWindow = new maps.InfoWindow({
            content: elt
          });
          infoWindow.addListener('closeclick', unshowInfo);
          infoScope = tScope;
        });

        if (doc.readyState === "complete") {
          initialize();
        } else {
          maps.event.addDomListener($window, 'load', initialize);
        }
      }
    }
  }
]);
