var makeJumpToMapFn = function ($scope) {
  return function (venue) {
    $scope.viewStyle.style = 'map';
    $scope.$broadcast('selectmapdata', venue);
  };
};

angular.module('concert-search')

.controller('EventsCtrl', ['eventsList', function (eventsList) {
  this.events = eventsList.events;
}])

.controller('VenuesCtrl', [
  '$scope', 'venuesList', 'uiMap',
  function ($scope, venuesList, uiMap) {
    this.venues = venuesList.venues;
    this.jumpToMap = makeJumpToMapFn($scope);
  }
])

.controller('VenueEventsCtrl', [
  'venuesList', '$stateParams',
  function (venuesList, $stateParams) {
    this.venue = venuesList.getCanonicalVenue({id: $stateParams.venueId });
    this.events = this.venue.events;
    this.jumpToMap = makeJumpToMapFn($scope);
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
