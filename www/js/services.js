angular.module('concert-search')

.factory('maps', ['$document', function ($document) {
  var maps = Object.create(google.maps);
  var ps, gc;
  maps.getPlacesService = function () {
    if (!ps) {
      // Element is a dummy to make the service happy. Actual rendering of
      // attribution data is defined in views.js
      var attrib = $document[0].createElement('div');
      ps = new google.maps.places.PlacesService(attrib);
    }
    return ps;
  };
  maps.getGeocoder = function () {
    if (!gc) {
      gc = new google.maps.Geocoder();
    }
    return gc;
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
    return !event ? '' : event.artists
      .map(function (artist) { return artist.name; })
      .join('/');
  };
})  

.factory('eventsList', [
  'APPID', 'mapPosition', '$http',
  function (APPID, mapPosition, $http) {
    var events = [];

    var eventsLoad = $http.jsonp(
      'http://api.bandsintown.com/events/search.json',
      { params: {
          location: mapPosition.lat + ',' + mapPosition.lng,
          radius: mapPosition.radius,
          callback: 'JSON_CALLBACK',
          app_id: APPID
        } }
    );

    eventsLoad
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

.factory('venuesList', [
  'maps', 'eventsList', '$rootScope', '$q',
  function (maps, eventsList, $rootScope, $q) {
    var vl = {
      venues: []
    };

    var places = maps.getPlacesService();
    var geo = maps.getGeocoder();

    $rootScope.$watchCollection(
      function () { return eventsList.events; },
      function () {
        vl.venues = eventsList.events.map(function (event) {
          return processVenue(event.venue);
        });
      }
    );

    vl.fetchAddress = function (venue) {
      var options = {
        query: venue.name,
        location: new maps.LatLng(venue.latLng.lat, venue.latLng.lng),
        radius: 100
      };

      var loadProcess = $q.defer();
      // Try first with places service using both name and latitude/longitude
      places.textSearch(options, function (res, textStatus, status) {
        var match = res && res[0];
        if (textStatus !== 'OK' || !match) {
          // Retry on failure with geocoder based on lat/lng only. Expecting
          //   this to be less exact, intuitively, but have not tested.
          geo.geocode(
            { location: { lat: venue.latLng.lat, lng: venue.latLng.lng } },
            function (res, status) {
              match = res && res[0];
              if (status !== maps.GeocoderStatus.OK || !match) {
                var err = new Error(
                  'Unable to find place details for ' + venue.name
                );
                err.response = response;
                err.textStatus = textStatus;
                err.status = status;
                return loadProcess.reject(err);
              }
              loadProcess.resolve(match);
            }
          )
        }
        loadProcess.resolve(match);
      });

      return loadProcess.promise.then(function (match) {
        venue.address = match.formatted_address;
        venue.rating = match.rating;
        venue.attrib = match.html_attribution;
      });
    };

    return vl;
  }
])

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

var processEvent = function (rawEvent) {
  rawEvent.latLng = {
    lat: rawEvent.venue.latitude,
    lng: rawEvent.venue.longitude
  };
  return rawEvent;
};

var processVenue = function (rawVenue) {
  rawVenue.latLng = {
    lat: rawVenue.latitude,
    lng: rawVenue.longitude
  };
  return rawVenue;
};
