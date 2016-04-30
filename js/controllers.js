angular.module('concert-search')

.controller('EventsCtrl', [
  '$scope', 'eventsList', 'recommendedEventsList', 'mapPosition',
  function ($scope, eventsList, recommendedEventsList, mapPosition) {
    var installedEventsList = eventsList;
    this.events = eventsList.events;

    this.viewStyle = {
      style: 'Map'
    };

    this.refresh = function () {
      installedEventsList.refresh();
    };

    var self = this;
    mapPosition.on('change', function () {
      self.viewStyle.style = 'Map';
    });

    this.searchOptions = {
      radius: mapPosition.radius,
      filtering: false
    };
    $scope.$watch('$ctrl.searchOptions.radius', function () {
      mapPosition.radius = self.searchOptions.radius;
      mapPosition.emit('change');
      installedEventsList.refresh();
    });

    $scope.$watch('$ctrl.searchOptions.filtering', function () {
      installedEventsList = self.searchOptions.filtering
        ? recommendedEventsList
        : eventsList;
      self.events = installedEventsList.events;
    });
  }
])

.controller('VenuesCtrl', [
  '$scope', 'venuesList', 'jumpToMap', 'mapPosition',
  function ($scope, venuesList, jumpToMap, mapPosition) {
    this.venues = venuesList.venues;
    this.viewStyle = {
      style: 'Map'
    };

    this.refresh = function () {
      venuesList.refresh();
    };

    var self = this;
    mapPosition.on('change', function () {
      self.viewStyle.style = 'Map';
    });
    this.jumpToMap = jumpToMap;

    // When the viewstyle changes from 'list' to anything else, cancel the
    // currently-outstanding requests;
    var previousViewStyle;
    $scope.$watch('$ctrl.viewStyle.style', function () {
      if (previousViewStyle === 'list' && self.viewStyle.style !== 'list') {
        venuesList.cancelOutstandingRequests();
      }
      previousViewStyle = self.viewStyle.style;
    });

    this.searchOptions = {
      radius: mapPosition.radius
    };
    $scope.$watch('$ctrl.searchOptions.radius', function () {
      mapPosition.radius = self.searchOptions.radius;
      mapPosition.emit('change');
      venuesList.refresh();
    });
  }
])

.controller('VenueEventsCtrl', [
  '$scope', 'venuesList', 'jumpToMap', '$stateParams',
  function ($scope, venuesList, jumpToMap, $stateParams) {
    this.venue = venuesList.getCanonicalVenue({id: $stateParams.venueId });
    this.events = this.venue.events;
    this.jumpToMap = jumpToMap;
  }
])

.controller('ArtistsCtrl', [
  '$scope', 'artistsList', 'favoriteArtists', 'debounce',
  function ($scope, artistsList, favoriteArtists, debounce) {
    this.artists = artistsList.artists;
    this.artistFilter = '';

    this.filterArtists = debounce(function () {
      artistsList.setQuery(this.artistFilter);
      // artistsList resets this property. Leaky abstraction. Not cool.
      this.artists = artistsList.artists;
    });

    this.loadArtists = function () {
      var artistsLoaded = artistsList.setSize(
        this.artists.length + artistsList.defaultPageSize
      );
      artistsLoaded.then(function () {
        $scope.$broadcast('scroll.infiniteScrollComplete');
      });
    };
  }
])

.controller('favoritesCounterCtrl', [
  '$scope', 'favoriteArtists',
  function ($scope, favoriteArtists) {
    $scope.$watch(
      function () { return favoriteArtists.length; },
      function () { $scope.favCount = favoriteArtists.length; }
    );
  }
]);
