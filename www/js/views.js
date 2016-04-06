// createStyles may be mixed-into a constructor or factory function to apply the
// properties used for alternating between map and list display.
var createStyles = function (ctrl) {
  ctrl.styles = ['map', 'list'];
  ctrl.style = 'map';
  return ctrl;
};

angular.module('concert-search')

.directive('eventsView', function () {
  return {
    templateUrl: '/templates/events-view.html',
    scope: {
      title: '@'
    },
    bindToController: true,
    controllerAs: '$ctrl',
    controller: ['eventsList', function (eventsList) {
      createStyles(this);
      this.events = eventsList.events;
    }]
  };
})

.directive('venuesView', function () {
  return {
    templateUrl: '/templates/venues-view.html',
    scope: {
      title: '@'
    },
    bindToController: true,
    controllerAs: '$ctrl',
    controller: ['venuesList', function (venuesList) {
      createStyles(this);
      this.venues = venuesList.venues;
    }]
  };
})

.directive('venueView', function () {
  return {
    template: ''
      + '<h4>{{ venue.title }}</h4>'
      + '<venue-address address="venue.address"></venue-address>'
      + '<p ng-if="venue.rating">Average rating: {{ venue.rating }}</p>'
      + '<a href="#" ng-click="$event.preventDefault()">upcoming events</a>',
    scope: {
      venue: '='
    }
  }
})

.directive('venueAddress', function () {
  return {
    template: ''
      + '<div class="address-line1">{{ line1 }}</div>'
      + '<div class="address-line2">{{ line2 }}</div>',
    scope: {
      address: '='
    },
    link: function ($scope, $element, $attr) {
      $scope.$watch('address', function () {
        if (!$scope.address) { return; }
        var parts = $scope.address.split(', ');
        // discard the last part (country name)
        parts.pop()
        $scope.line1 = parts[0]
        $scope.line2 = parts.slice(1).join(', ');
      });
    }
  }
});
