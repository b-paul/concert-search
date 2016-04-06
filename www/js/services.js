angular.module('concert-search')

.factory('maps', ['$document', function ($document) {
  var maps = Object.create(google.maps);
  var ps;
  maps.getPlacesService = function () {
    if (!ps) {
      // Element is a dummy to make the service happy. Actual rendering of
      // attribution data is defined in views.js
      var attrib = $document[0].createElement('div');
      ps = new google.maps.places.PlacesService(attrib);
    }
    return ps;
  };
  return maps;
}])

.factory('eventsList', function () {
  return {
    events: []
  };
})

.factory('venuesList', ['maps', function (maps) {
  var venues = [
    { title: 'Ivory Room',
      latLng: {
        lat: 43.0743976,
        lng: -89.38719079999998
      } },
    { title: 'The Frequency',
      latLng: {
        lat: 43.07237920000001,
        lng: -89.38478880000002
      } },
    { title: 'Majestic Theatre',
      latLng: {
        lat: 43.0744173,
        lng: -89.38093500000002
      } }
  ];

  var places = maps.getPlacesService();
  venues.forEach(function (v) {
    var options = {
      query: v.title,
      location: new maps.LatLng(v.latLng.lat, v.latLng.lng),
      radius: 100
    };
    places.textSearch(options, function (res, textStatus, status) {
      var match = res && res[0];
      if (textStatus !== 'OK' || !match) {
        return console.error(
          'Unable to find place details for ' + v.title, status
        );
      }
      v.address = match.formatted_address;
      v.rating = match.rating;
    });
  });

  return {
    venues: venues
  };
}]);
