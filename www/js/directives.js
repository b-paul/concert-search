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
      var map;
      var initialize = function () {
        var mapOptions = {
          center: new maps.LatLng(mapPosition.lat, mapPosition.lng),
          zoom: 15,
          mapTypeId: maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false
        };
        map = new maps.Map($element[0], mapOptions);
        $ctrl.setMap(map);
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
        }
      );
    }
  }
}])

.directive('mapData', [
  'maps', 'mapSelection', 'venuesList',
  function (maps, mapSelection, venuesList) {
    return {
      restrict: 'A',
      scope: {
        mapData: '='
      },
      require: 'map',
      transclude: true,
      link: function ($scope, $element, $attr, mapController, $transclude) {
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
          // Listen for selection change and reflect each on scope
          mapSelection.onSelect(function onSelect(selectedMapData) {
            if (mapSelection.getInfoWindowContent() !== elt) {
              return mapSelection.offSelect(onSelect);
            }
            scope.selectedMapData = selectedMapData;
          });
        });

        mapController.getMap(function (map) {
          mapSelection.setMap(map);
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
