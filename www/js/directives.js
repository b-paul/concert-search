angular.module('concert-search')

.directive('map', ['maps', function(maps) {
  return {
    restrict: 'E',
    link: function ($scope, $element, $attr) {
      function initialize() {
        var mapOptions = {
          center: new maps.LatLng(43.07493, -89.381388),
          zoom: 15,
          mapTypeId: maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false
        };
        $scope.map = new maps.Map($element[0], mapOptions);
  
        // Stop the side bar from dragging when mousedown/tapdown on the map
        maps.event.addDomListener($element[0], 'mousedown', function (e) {
          e.preventDefault();
          return false;
        });

        // register the current map to be controlled from elsewhere
        maps.register('mainUiMap', $scope.map);
      }

      if (document.readyState === "complete") {
        initialize();
      } else {
        maps.event.addDomListener(window, 'load', initialize);
      }
    },
    controller: ['$scope', function ($scope) {
      var waitingForMap = [];
      var provideMap = function (cb) {
        cb($scope.map);
      };


      this.getMap = function (cb) {
        if ($scope.map) {
          provideMap(cb);
        } else {
          waitingForMap.push(cb);
        }
      };

      var unWatch = $scope.$watch('map', function () {
        unWatch();
        waitingForMap.forEach(provideMap);
      });
    }]
  }
}])

.directive('mapData', ['maps', function (maps) {
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
}])

.directive('radioGroup', function () {
  return {
    template: ''
      + '<div class="radiogroup">'
        + '<label ng-repeat="opt in $ctrl.options">'
          + '{{ opt }}'
          + '<input type="radio" name="{{ $ctrl.name }}"'
                  + 'value="{{ opt }}"'
                  + 'ng-model="$ctrl.model">'
        + '</label>'
      + '</div>',
    scope: {
      name: '=',
      options: '=',
      model: '='
    },
    bindToController: true,
    controllerAs: '$ctrl',
    controller: function () {
      var ctrl = this;
      ctrl.select = function () {
        ctrl.onChange({i: ctrl.selected});
      }
    }
  };
});
