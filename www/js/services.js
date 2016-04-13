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
  var map, selection, infoWindow, iwContent;
  var markersPending = [];
  var markers = {};
  var listeners = [];

  var key = function (data) {
    return data.id;
  };

  return {
    setInfoWindowContent: function (elt) {
      iwContent = elt;
      this.setSelection(selection);
    },
    getInfoWindowContent: function () {
      return iwContent;
    },
    setMap: function (m) {
      map = m;
      var self = this;
      markersPending.forEach(function (bundle) {
        var mrk = bundle[0], data = bundle[1];
        self.addMarker(mrk, data);
      });
      markersPending = [];
    },
    addMarker: function (mrk, data) {
      var dataKey = key(data);
      markers[dataKey] = mrk;
      if (!map) {
        markersPending.push([mrk, data]);
      } else {
        mrk.setMap(map);
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
      if (!data) { return; }
      selection = data;
      var dataKey = key(data);
      var mrk = markers[dataKey];
      if (mrk && map) {
        infoWindow && infoWindow.close();
        infoWindow = new maps.InfoWindow({
          content: iwContent
        });
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
  'APPID', 'maps', 'eventsList', 'ThrottledResource',
  '$rootScope', '$q', '$http',
  function (APPID, maps, eventsList, ThrottledResource, $rootScope, $q, $http) {
    var venuesById = {};
    var vl = {
      venues: []
    };

    var places = maps.getPlacesService();
    var geo = maps.getGeocoder();

    $rootScope.$watchCollection(
      function () { return eventsList.events; },
      function () {
        vl.venues = eventsList.events.reduce(function (acc, event) {
          var venue = vl.getCanonicalVenue(event.venue);
          if (acc.indexOf(venue) + 1) {
            return acc;
          }
          return acc.concat(venue);
        }, []);
      }
    );

    vl.getCanonicalVenue = function (venue) {
      var canonical = venuesById[venue.id];
      if (!canonical) {
        canonical = processVenue(venue);
        venuesById[canonical.id] = canonical;
      }
      return canonical;
    };

    var fetcher = new ThrottledResource();

    vl.fetchEvents = function (venue) {
      var eventsLoaded = $http.jsonp(
        '//api.bandsintown.com/venues/' + venue.id + '/events.json',
        { params: {
            callback: 'JSON_CALLBACK',
            app_id: APPID
          } }
      );

      return eventsLoaded.then(function (res) {
        venue.events = res.data;
      });
    };

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
          venue.latLng.lat = match.geometry.location.lat();
          venue.latLng.lng = match.geometry.location.lng();
          return venue;
        });
      });
    };

    return vl;
  }
])

.factory('artistsList', ['$http', function ($http) {
  var al = {
    artists: []
  };

  al.defaultPageSize = 10;
  var size = al.defaultPageSize;
  var offset = 0;

  var query = '.';

  var artistsLoaded;
  var loadArtists = function () {
    console.log('loading ' + offset + '-' + size);
    // http://stackoverflow.com/a/6969486
    query = query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    artistsLoaded = $http
      .get(
        'https://musicbrainz.org/ws/2/artist/',
        { params: {
            query: 'artist:/' + query + '/',
            offset: offset,
            limit: size - offset,
            fmt: 'json'
          } }
      )
      .then(function (res) {
        [].push.apply(al.artists, res.data.artists);
      });

    artistsLoaded.catch(function (err) {
      console.error('An error occurred while loading artists list.')
      console.error(err);
    });
  };
  loadArtists();

  al.setSize = function (newSize) {
    console.log('setSize');
    if (isNaN(newSize)) {
      throw new Error('Cannot setSize with non-number');
    }
    offset = size;
    size = newSize;
    artistsLoaded = artistsLoaded.then(loadArtists);
    return artistsLoaded;
  };

  al.setQuery = function (newQuery) {
    console.log('new query = ' + newQuery);
    query = newQuery;
    al.artists = [];
    size = al.defaultPageSize;
    offset = 0;
    artistsLoaded = artistsLoaded.then(loadArtists);
    return artistsLoaded;
  };

  return al;
}])

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
}])

.factory('debounce', function () {
  // Credit: https://davidwalsh.name/javascript-debounce-function
  //
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  //
  // Default wait is 100ms.
  return function debounce(func, wait, immediate) {
    isNaN(wait) && (wait = 100);
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
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
