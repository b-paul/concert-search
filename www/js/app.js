angular.module('concert-search', ['ionic', 'ngSanitize'])

.value('APPID', 'concert-search')

.value('MARKER_ICON', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAuMDAwMDAwMDAwMDAwMDA0IiBoZWlnaHQ9IjMwLjAwMDAwMDAwMDAwMDAwNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDwhLS0gQ3JlYXRlZCB3aXRoIE1ldGhvZCBEcmF3IC0gaHR0cDovL2dpdGh1Yi5jb20vZHVvcGl4ZWwvTWV0aG9kLURyYXcvIC0tPgoKIDxnPgogIDx0aXRsZT5iYWNrZ3JvdW5kPC90aXRsZT4KICA8cmVjdCBmaWxsPSJub25lIiBpZD0iY2FudmFzX2JhY2tncm91bmQiIGhlaWdodD0iMzIiIHdpZHRoPSIzMiIgeT0iLTEiIHg9Ii0xIi8+CiAgPGcgZGlzcGxheT0ibm9uZSIgaWQ9ImNhbnZhc0dyaWQiPgogICA8cmVjdCBmaWxsPSJ1cmwoI2dyaWRwYXR0ZXJuKSIgc3Ryb2tlLXdpZHRoPSIwIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIiBpZD0ic3ZnXzIiLz4KICA8L2c+CiA8L2c+CiA8Zz4KICA8dGl0bGU+TGF5ZXIgMTwvdGl0bGU+CiAgPGVsbGlwc2Ugc3Ryb2tlPSIjN2YwMDNmIiByeT0iNi42MzkxNzUiIHJ4PSI2LjYzOTE3NSIgaWQ9InN2Z18xIiBjeT0iMTQuNzkzODE1IiBjeD0iMTUuMzI0NzQzIiBmaWxsPSIjZmY0OTlmIi8+CiA8L2c+Cjwvc3ZnPg==')

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
