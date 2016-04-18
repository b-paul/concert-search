angular.module('concert-search')

.controller('EventsCtrl', [
  '$scope', 'eventsList', 'mapPosition',
  function ($scope, eventsList, mapPosition) {
    this.events = eventsList.events;
    this.viewStyle = {
      style: 'map'
    };
    var self = this;
    mapPosition.on('change', function () {
      self.viewStyle.style = 'map';
    });
  }
])

.controller('VenuesCtrl', [
  '$scope', 'venuesList', 'jumpToMap', 'mapPosition',
  function ($scope, venuesList, jumpToMap, mapPosition) {
    this.venues = venuesList.venues;
    this.viewStyle = {
      style: 'map'
    };
    var self = this;
    mapPosition.on('change', function () {
      self.viewStyle.style = 'map';
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
