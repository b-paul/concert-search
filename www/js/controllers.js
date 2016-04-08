angular.module('concert-search')

.controller('favoritesCounter', [
  '$scope', 'favoriteArtists',
  function ($scope, favoriteArtists) {
    $scope.$watch(function () { return favoriteArtists.length; }, function () {
      $scope.favCount = favoriteArtists.length;
    });
  }
]);
