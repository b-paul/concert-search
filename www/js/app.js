angular.module('concert-search', ['ionic', 'ngSanitize'])

.value('APPID', 'concert-search')

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})
