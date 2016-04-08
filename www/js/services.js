var processEvent = function (rawEvent) {
  rawEvent.latLng = {
    lat: rawEvent.venue.latitude,
    lng: rawEvent.venue.longitude
  };
  return rawEvent;
};

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

.factory('mapPosition', [function () {
  // Set initial values
  return {
    lat: 43.07493,
    lng: -89.381388,
    radius: 25
  };
}])  

.factory('eventsList', [
  'APPID', 'mapPosition', '$http',
  function (APPID, mapPosition, $http) {
    var events = [];

    var eventsLoaded = $http.jsonp(
      '//api.bandsintown.com/events/search.json',
      { params: {
          location: mapPosition.lat + ',' + mapPosition.lng,
          radius: mapPosition.radius,
          callback: 'JSON_CALLBACK',
          app_id: APPID
        } }
    );

    eventsLoaded
      .then(function (res) {
        if (res.data.errors) {
          throw new Error(res.data.errors[0]);
        }
        [].push.apply(events, res.data.map(processEvent));
      })
      .catch(function (err) {
        console.error('An error occurred while loading events list.');
        console.error(err);
      });

    return {
      events: events
    };
  }
])

.filter('eventArtistNames', function () {
  return function (event) {
    return event.artists
      .map(function (artist) { return artist.name; })
      .join('/');
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
      v.attrib = match.html_attribution;
    });
  });

  return {
    venues: venues
  };
}])

.factory('artistsList', [
  'APPID', '$http',
  function (APPID, $http) {
    var artists = [];

    var artistsLoaded = $http.get(
      'https://musicbrainz.org/ws/2/artist/',
      { params: {
          query: 'artist:/./',
          fmt: 'json'
        } }
    );

    artistsLoaded
      .then(function (res) {
        [].push.apply(artists, res.data.artists);
      })
      .catch(function (err) {
        console.error('An error occurred while loading artists list.')
        console.error(err);
      });

    return {
      artists: artists
    };
  }
])

.factory('favoriteArtists', function () {
  var favorites = {};
  return {
    length: 0,
    contains: function (id) {
      return (id in favorites);
    },
    add: function (id) {
      if (this.contains(id)) {
        return;
      }
      this.length++;
      favorites[id] = true;
    },
    remove: function (id) {
      this.length--;
      delete favorites[id];
    },
    toggle: function (id) {
      return this.contains(id) ? this.remove(id) : this.add(id)
    }
  };
});
