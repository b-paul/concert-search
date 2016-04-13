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
      + '<div class="radiogroup">'
        + '<label ng-repeat="opt in [\'map\', \'list\']">'
          + '{{ opt }}'
          + '<input type="radio" name="style"'
                 + 'value="{{ opt }}"'
                 + 'ng-model="viewStyle.style">'
        + '</label>'
      + '</div>',
    controller: ['$scope', function ($scope) {
      $scope.viewStyle = {
        style: 'map'
      };
    }]
  };
})

.directive('mapView', ['maps', '$window', function(maps, $window) {
  var doc = $window.document;
  return {
    restrict: 'E',
    scope: {
      mapData: '=',
    },
    transclude: true,
    link: function ($scope, $element, $attr, $ctrl, $transclude) {
      var map, infoWindow, infoScope, info;

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
        infoScope = tScope;
      });

      var markers = [];
      var markersDict = {};

      var getKey = function (data) {
        return data.id;
      };

      var showInfo = function (data) {
        info = data;
        var dataKey = getKey(info);
        var marker = markersDict[dataKey];
        if (!info || !marker) {
          info = null;
          return infoWindow.close();
        }
        angular.extend(infoScope, info);
        infoWindow.open(map, marker);
      };

      $scope.$on('selectmapdata', function (evt, data) { showInfo(data); });

      var setMarkers = function () {
        markers.forEach(function (marker) { marker.setMap(null); });
        markersDict = {};
        console.log(map);
        console.log($scope.mapData);
        markers = $scope.mapData.map(function (data) {
          var dataKey = getKey(data);
          var marker = new maps.Marker({
            map: map,
            location: new maps.LatLng(data.latitude, data.longitude),
            title: data.title
          });
          markersDict[dataKey] = marker;
          marker.addListener('click', function () { showInfo(data); });
          return marker;
        });
        console.log(markers);
        info && showInfo(info);
      };

      var initialize = function () {
        console.log(firstElement($element));
        map = new maps.Map(firstElement($element), {
          center: new maps.LatLng(32.756784, -97.070123),
          zoom: 13,
          mapTypeId: maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false
        });

        $scope.$watchCollection('mapData', setMarkers);
      };

      if (doc.readyState === "complete") {
        initialize();
      } else {
        maps.event.addDomListener($window, 'load', initialize);
      }
    }
  }
}]);
