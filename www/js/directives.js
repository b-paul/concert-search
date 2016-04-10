angular.module('concert-search')

.directive('map', ['maps', 'mapPosition', function(maps, mapPosition) {
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
      var initialize = function () {
        var mapOptions = {
          center: new maps.LatLng(mapPosition.lat, mapPosition.lng),
          zoom: 15,
          mapTypeId: maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false
        };
        var map = new maps.Map($element[0], mapOptions);
        $ctrl.setMap(map);
      };

      if (document.readyState === "complete") {
        initialize();
      } else {
        maps.event.addDomListener(window, 'load', initialize);
      }
    }
  }
}])

.directive('mapData', ['maps', 'venuesList', function (maps, venuesList) {
  return {
    restrict: 'A',
    scope: {
      mapData: '='
    },
    require: 'map',
    transclude: true,
    link: function ($scope, $element, $attr, mapController, $transclude) {
      var infoWindow = new maps.InfoWindow();
      var infoScope;

      var firstElement = function ($dom) {
        for (var i = 0, l = $dom.length; i < l; i++) {
          if ($dom[i] instanceof HTMLElement) {
            return $dom[i];
          }
        }
      };

      // Access the transcluded element(s) and scope
      $transclude(function (clone, scope) {
        // Set the info window to display the transcluded content when opened
        infoWindow.setContent(firstElement(clone));
        // Export the transcluded scope for later augmentation
        infoScope = scope;
      });

      mapController.getMap(function (map) {
        var markers = [];

        var updateMarkers = function () {
          markers.forEach(function (m) { m.setMap(null); });
          markers = [];

          $scope.mapData.forEach(function (data) {
            var marker = new maps.Marker({
              position: new maps.LatLng(
                data.latLng.lat, data.latLng.lng
              ),
              title: data.title
            });
            marker.addListener('click', function () {
              infoScope.$apply(function () {
                infoScope.selectedMapData = data;
              });
              infoWindow.open(map, marker);
            });
            marker.setMap(map);
            markers.push(marker);
          });
        };

        updateMarkers();
        $scope.$watchCollection('mapData', updateMarkers);
      });
    }
  }
}]);
