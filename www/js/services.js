angular.module('concert-search')

.factory('maps', function () {
  var registry = {};
  var waiters = {};
  var provideMap = function (cb, map) { setTimeout(cb.bind(null, map), 0); };
  var maps = Object.create(google.maps);
  maps.register = function (id, map) {
    console.log('registering ' + id);
    registry[id] = map;
    if (waiters[id]) {
      waiters[id].forEach(function (cb) {
        provideMap(cb, map);
      });
    }
  };
  maps.getMap = function (id, cb) {
    console.log('request for ' + id);
    if (registry[id]) {
      provideMap(cb, registry[id]);
    } else {
      waiters[id] = (waiters[id] || []).concat(cb);
    }
  };
  return maps;
})

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

  maps.getMap('mainUiMap', function (map) {
    var places = new google.maps.places.PlacesService(map);
    venues.forEach(function (v) {
      var options = {
        query: v.title,
        location: new maps.LatLng(v.latLng.lat, v.latLng.lng),
        radius: 100
      };
      places.textSearch(options, function (res, textStatus, status) {
        if (textStatus !== 'OK') {
          return console.error(
            'Unable to find place details for ' + v.title, status
          );
        }
        var match = res[0];
        v.address = match.formatted_address;
        v.rating = match.rating;
      });
    });
  });

  return {
    venues: venues
  };
}]);
