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

.factory('mapSelection', ['maps', function (maps) {
  var map, selection, iwContent;
  var infoWindow = new maps.InfoWindow();
  var markersPending = [];
  var markers = {};
  var listeners = [];

  var key = function (data) {
    return JSON.stringify(data);
  };

  return {
    setInfoWindowContent: function (elt) {
      iwContent = elt;
      infoWindow.setContent(elt);
    },
    getInfoWindowContent: function () {
      return iwContent;
    },
    setMap: function (m) {
      map = m;
      markers = {};
      var self = this;
      markersPending.forEach(function (bundle) {
        var mrk = bundle[0], data = bundle[1];
        self.addMarker(mrk, data);
      });
      markersPending = [];
    },
    addMarker: function (mrk, data) {
      if (!map) {
        markersPending.push([mrk, data]);
      } else {
        mrk.setMap(map);
        var dataKey = key(data);
        markers[dataKey] = mrk;
        if (data === selection) {
          this.setSelection(data);
        }
      }
    },
    removeMarker: function (mrk) {
      mrk.setMap(null);
      Object.keys(markers).forEach(function (k) {
        if (markers[k] === mrk) { delete markers[k]; }
      });
    },
    setSelection: function (data) {
      selection = data;
      var dataKey = key(data);
      var mrk = markers[dataKey];
      if (mrk && map && infoWindow) {
        infoWindow.open(map, mrk);
      }
      listeners.forEach(function (l) {
        l(data);
      });
    },
    onSelect: function (listener) {
      listeners.push(listener);
    },
    offSelect: function (listener) {
      listeners = listeners.filter(function (l) { return l !== listener; });
    }
  }
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
    return !event
      ? ''
      : event.artists
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
  'maps', 'eventsList', 'ThrottledResource', '$rootScope', '$q',
  function (maps, eventsList, ThrottledResource, $rootScope, $q) {
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

    var fetcher = new ThrottledResource();
    vl.fetchAddress = function (venue) {
      var options = {
        query: venue.name,
        location: new maps.LatLng(venue.latLng.lat, venue.latLng.lng),
        radius: 100
      };

      return fetcher.addTask(function () {
        var loadProcess = $q.defer();
        // Try first with places service using both name and latitude/longitude
        places.textSearch(options, function (res, textStatus, status) {
          var match = res && res[0];
          if (textStatus !== 'OK' || !match) {
            // Retry on failure with geocoder based on lat/lng only. Expecting
            //   this to be less exact, intuitively, but have not tested.
            return geo.geocode(
              { location: { lat: venue.latLng.lat, lng: venue.latLng.lng } },
              function (res, status) {
                match = res && res[0];
                if (status !== maps.GeocoderStatus.OK || !match) {
                  var err = new Error(
                    'Unable to find place details for ' + venue.name
                  );
                  err.response = res;
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
          return venue;
        });
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
})

.factory('ThrottledResource', ['$q', '$timeout', function ($q, $timeout) {
  return function ThrottledResource() {
    var self = this;

    self.taskRate = 500; // Start at most 1 task per 500ms
    var taskTimer;

    self.taskBandwidth = 5; // Up to 5 tasks in parallel
    var tasksOut = 0;
    var pendingTasks = [];

    self.addTask = function (task) {
      if (taskTimer) {
        return taskTimer.then(function () {
          self.addTask(task);
        });
      } else if (tasksOut >= self.taskBandwidth) {
        var deferredTask = $q.defer();
        pendingTasks.push(function () {
          var innerResult = task();
          deferredTask.resolve(innerResult);
          return innerResult;
        });
        return deferredTask.promise;
      } else {
        var result = task();
        result.finally(function () {
          tasksOut--;
          var next = pendingTasks.shift();
          next && self.addTask(next);
        });
        tasksOut++;
        taskTimer = $timeout(function () {
          taskTimer = null;
        }, self.taskRate);
        return result;
      }
    };
  };
}]);

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
