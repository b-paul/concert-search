angular.module('concert-search')

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

  .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'app-template'
  })

  .state('app.events', {
    url: '/events',
    views: {
      'events-view': {
        templateUrl: '/templates/events-view.html',
        controller: 'EventsCtrl',
        controllerAs: '$ctrl'
      }
    }
  })

  .state('app.venues', {
    url: '/venues',
    views: {
      'venues-view': {
        templateUrl: '/templates/venues-view.html',
        controller: 'VenuesCtrl',
        controllerAs: '$ctrl'
      }
    }
  })

  .state('app.venue-events', {
    url: '/venues/:venueId/events',
    views: {
      'venues-view': {
        templateUrl: '/templates/venue-events-view.html',
        controller: 'VenueEventsCtrl',
        controllerAs: '$ctrl'
      }
    }
  })

  .state('app.artists', {
    url: '/artists',
    views: {
      'artists-view': {
        templateUrl: 'templates/artists-view.html',
        controller: 'ArtistsCtrl',
        controllerAs: '$ctrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/events');

});
