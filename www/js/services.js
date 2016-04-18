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

.factory('mapPosition', ['makeEventEmitter', function (makeEventEmitter) {
  return makeEventEmitter({
    latitude: 32.756784,
    longitude: -97.070123,
    zoom: 13,
    radius: 5
  });
}])

.factory('eventsList', [
  'APPID', '$http', 'mapPosition',
  function (APPID, $http, mapPosition) {
    var events = [];

    var latitude = mapPosition.latitude;
    var longitude = mapPosition.longitude;
    var location = latitude + ',' + longitude;
    var eventsLoaded = $http.jsonp(
      '//api.bandsintown.com/events/search.json',
      { params: {
          location: location,
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
        var newVenues = eventsList.events.reduce(function (acc, event) {
          var venue = vl.getCanonicalVenue(event.venue);
          if (acc.indexOf(venue) + 1) {
            return acc;
          }
          return acc.concat(venue);
        }, []);
        [].splice.apply(vl.venues, [0, vl.venues.length].concat(newVenues));
      }
    );

    vl.getCanonicalVenue = function (venue) {
      var canonical = venuesById[venue.id];
      if (!canonical) {
        canonical = venue;
        venuesById[canonical.id] = canonical;
      }
      return canonical;
    };

    var fetcher = new ThrottledResource();
    var outstandingRequests = [];

    vl.fetchEvents = function (venue) {
      var eventsLoaded = $http.jsonp(
        '//api.bandsintown.com/venues/' + venue.id + '/events.json',
        { params: {
            callback: 'JSON_CALLBACK',
            app_id: APPID
          } }
      );

      var fetchTask = eventsLoaded.then(function (res) {
        venue.events = res.data;

        outstandingRequests = outstandingRequests.filter(function (o) {
          return o !== fetchTask;
        });
      });

      outstandingRequests.push(fetchTask);
      return fetchTask;
    };

    vl.fetchAddress = function (venue) {
      var options = {
        query: venue.name,
        location: new maps.LatLng(venue.latitude, venue.longitude),
        radius: 100
      };

      var fetchTask = fetcher.addTask(function () {
        var loadProcess = $q.defer();
        // Try first with places service using both name and latitude/longitude
        places.textSearch(options, function (res, textStatus, status) {
          var match = res && res[0];
          if (textStatus !== 'OK' || !match) {
            // Retry on failure with geocoder based on lat/lng only. Expecting
            //   this to be less exact, intuitively, but have not tested.
            return geo.geocode(
              { location: { lat: venue.latitude, lng: venue.longitude } },
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

        outstandingRequests = outstandingRequests.filter(function (o) {
          return o !== fetchTask;
        });

        return loadProcess.promise.then(function (match) {
          venue.address = match.formatted_address;
          venue.rating = match.rating;
          venue.attrib = match.html_attribution;
          venue.latitude = match.geometry.location.lat();
          venue.longitude = match.geometry.location.lng();
          return venue;
        });
      });

      outstandingRequests.push(fetchTask);
      return fetchTask;
    };

    vl.cancelOutstandingRequests = function () {
      outstandingRequests.forEach(function (o) {
        try {
          o.cancelTask();
        } catch (err) {
          console.error('Error trying to cancel task', o);
          console.error(err);
        }
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

  var query = '';

  var artistsLoaded;
  var loadArtists = function () {
    // http://stackoverflow.com/a/6969486
    query = query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    artistsLoaded = $http
      .get(
        'https://musicbrainz.org/ws/2/artist/',
        { params: {
            query: 'artist:/' + (query || '.') + '/',
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
    if (isNaN(newSize)) {
      throw new Error('Cannot setSize with non-number');
    }
    offset = size;
    size = newSize;
    artistsLoaded = artistsLoaded.then(loadArtists);
    return artistsLoaded;
  };

  al.setQuery = function (newQuery) {
    query = newQuery;
    al.artists = [];
    size = al.defaultPageSize;
    offset = 0;
    artistsLoaded = artistsLoaded.then(loadArtists);
    return artistsLoaded;
  };

  return al;
}])

.factory('favoriteArtists', ['storage', function (storage) {
  var favorites = storage.get('favorites') || {};

  return {
    length: Object.keys(favorites).length,
    contains: function (id) {
      return (id in favorites);
    },
    add: function (id) {
      if (this.contains(id)) {
        return;
      }
      this.length++;
      favorites[id] = true;
      storage.save('favorites', favorites);
    },
    remove: function (id) {
      this.length--;
      delete favorites[id];
      storage.save('favorites', favorites);
    },
    toggle: function (id) {
      this.contains(id) ? this.remove(id) : this.add(id);
    }
  };
}])

.factory('storage', ['APPID', function (APPID) {
  var store = JSON.parse(localStorage.getItem(APPID) || '{}');

  return {
    save: function (key, value) {
      store[key] = value;
      localStorage.setItem(APPID, JSON.stringify(store));
    },
    get: function (key) {
      return store.key;
    }
  };
}])

.factory('ThrottledResource', ['$q', '$timeout', function ($q, $timeout) {
  return function ThrottledResource() {
    var self = this;

    self.taskLimit = 5; // execute the first 5 tasks immediately
    self.taskTimeout = 2500; // after meeting taskLimit, wait 2500ms
    var taskWatcher;

    var tasksOut = [];
    var pendingTasks = [];
    var noOpTask = function () { return $q.resolve(); };

    self.addTask = function (task) {
      if (tasksOut.length < self.taskLimit) {
        if (task.cancelled) {
          var replacementTask = pendingTasks.shift();
          replacementTask && $timeout(function () {
            self.addTask(replacementTask);
          }, 0);

          var fakeResult = $q.resolve();
          fakeResult.cancelTask = function () {};
          return  fakeResult;
        }

        var result = $q.resolve(task());
        result.cancelTask = function () {};

        tasksOut.push(result);
        if (tasksOut.length === self.taskLimit) {
          $q.all(tasksOut).then(function () {
            $timeout(function () {
              tasksOut = [];
              pendingTasks.splice(0, self.taskLimit).forEach(function (t) {
                self.addTask(t);
              });
            }, self.taskTimeout);
          });
        }

        return result;
      } else {
        var deferredResult = $q.defer();
        var deferredTask = function () {
          return deferredResult.resolve(task());
        };
        pendingTasks.push(deferredTask);
        deferredResult.promise.cancelTask = function () {
          deferredTask.cancelled = true;
        };
        return deferredResult.promise;
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
})

.factory('jumpToMap', ['mapPosition', function (mapPosition) {
  return function (venue) {
    mapPosition.info = venue;
    mapPosition.latitude = venue.latitude;
    mapPosition.longitude = venue.longitude;
    mapPosition.emit('change');
  };
}])

.factory('makeEventEmitter', ['$timeout', function ($timeout) {
  return function (obj) {
    var subs = {};
    getSubs = function (eventName) { return subs[eventName] || []; };

    obj.on = function (eventName, f) {
      subs[eventName] = getSubs(eventName).concat(f);
    };

    obj.off = function (eventName, f) {
      subs[eventName] = getSubs(eventName).filter(function (_f_) {
        return _f_ !== f;
      });
    };

    obj.one = function (eventName, f) {
      var self = this;
      return self.on(eventName, function subscriber() {
        f.apply(null, arguments);
        self.off(eventName, subscriber);
      });
    };

    obj.emit = function (eventName) {
      var args = [].slice.call(arguments, 1);
      getSubs(eventName).forEach(function (f) {
        $timeout(function () { f.apply(null, args); }, 0);
      });
    };

    return obj;
  };
}]);

var processEvent = function (eventData) {
  eventData.latitude = eventData.venue.latitude;
  eventData.longitude = eventData.venue.longitude;
  return eventData;
};
