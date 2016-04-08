angular.module('concert-search', ['ionic', 'ngSanitize'])

.value('APPID', 'concert-search')

.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.defaults.useXDomain = true;
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
}])

.run(['$ionicPlatform', function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
}]);
