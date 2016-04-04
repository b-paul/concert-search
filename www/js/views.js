angular.module('concert-search')

// TODO: extract templates
.directive('eventsView', function () {
  return {
    template: ''
      + '<ion-header-bar>'
        + '<h1 class="title">{{ $ctrl.title }}</h1>'
      + '</ion-header-bar>'
      + '<ion-content scroll="false">'
        + '<radio-group name="style"'
                     + 'options="$ctrl.styles"'
                     + 'model="$ctrl.style">'
        + '</radio-group>'
        + '<map ng-if="$ctrl.style == \'map\'" map-data="$ctrl.events">'
          + '<event-view event="currentData">'
        + '</map>'
        + '<ion-list ng-if="$ctrl.style == \'list\'">'
          + '<ion-item ng-repeat="event in $ctrl.events">'
            + '<event-view event="event">'
          + '</ion-item>'
        + '</ion-list>'
      + '</ion-content>',
    scope: {
      title: '@'
    },
    bindToController: true,
    controllerAs: '$ctrl',
    controller: EventsView
  };
})

.directive('venuesView', function () {
  return {
    template: ''
      + '<ion-header-bar>'
        + '<h1 class="title">{{ $ctrl.title }}</h1>'
      + '</ion-header-bar>'
      + '<ion-content scroll="false">'
        + '<radio-group name="style"'
                     + 'options="$ctrl.styles"'
                     + 'model="$ctrl.style">'
        + '</radio-group>'
        + '<map ng-if="$ctrl.style == \'map\'" map-data="$ctrl.venues">'
          + '<venue-view venue="selectedMapData">'
        + '</map>'
        + '<ion-list ng-if="$ctrl.style == \'list\'">'
          + '<ion-item ng-repeat="venue in $ctrl.venues">'
            + '<venue-view venue="venue">'
          + '</ion-item>'
        + '</ion-list>'
      + '</ion-content>',
    scope: {
      title: '@'
    },
    bindToController: true,
    controllerAs: '$ctrl',
    controller: VenuesView
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

function makeTwoStyleView(ctrl) {
  ctrl.styles = ['map', 'list'];
  ctrl.style = 'map';
  return ctrl;
};

function EventsView(eventsList) {
  makeTwoStyleView(this);
  this.events = eventsList.events;
};

EventsView.$inject = ['eventsList'];

function VenuesView(venuesList) {
  makeTwoStyleView(this);
  this.venues = venuesList.venues;
};

VenuesView.$inject = ['venuesList'];
