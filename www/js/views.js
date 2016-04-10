// createStyles may be mixed-into a constructor or factory function to apply the
// properties used for alternating between map and list display.
var createStyles = function (ctrl) {
  ctrl.styles = ['map', 'list'];
  ctrl.style = 'map';
  return ctrl;
};

angular.module('concert-search')

// TAB TOP-LEVEL VIEWS

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

.directive('artistsView', function () {
  return {
    templateUrl: '/templates/artists-view.html',
    scope: {
      title: '@'
    },
    bindToController: true,
    controllerAs: '$ctrl',
    controller: [
      'artistsList', 'favoriteArtists',
      function (artistsList) {
        this.artists = artistsList.artists;
      }
    ]
  };
})

// SUB-VIEWS/COMPONENTS

.directive('venueView', function () {
  return {
    template: ''
      + '<h4>{{ venue.name }}</h4>'
      + '<two-line-address address="venue.address"></two-line-address>'
      + '<p ng-if="venue.rating">Average rating: {{ venue.rating }}</p>'
      + '<p ng-bind-html="venue.attrib"></p>'
      + '<a href="#" ng-click="$event.preventDefault()">upcoming events</a>',
    scope: {
      venue: '='
    },
    controllerAs: '$ctrl',
    controller: ['$scope', 'venuesList', function ($scope, venuesList) {
      var lastVenueId;
      $scope.$watch('venue', function () {
        if ($scope.venue && $scope.venue.id !== lastVenueId) {
          lastVenueId = $scope.venue.id;
          $scope.venue.address = 'loading address...';
          venuesList.fetchAddress($scope.venue);
        }
      });
    }]
  };
})

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
      + '<div class="address-line1">{{ line1 }}</div>'
      + '<div class="address-line2">{{ line2 }}</div>',
    scope: {
      address: '='
    },
    link: function ($scope, $element, $attr) {
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
});
