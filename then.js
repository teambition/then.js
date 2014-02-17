'use strict';
/*global module, define, process, console*/

/**
 * then.js: very small asynchronous promise tool!
 * https://github.com/teambition/then.js
 * License: MIT
 */

(function () {
  var emptyThen = {},
    slice = [].slice,
    isArray = Array.isArray,
    nextTick = typeof process === 'object' && process.nextTick ? process.nextTick : setTimeout;

  function NOOP() {}

  function isNull(obj) {
    return obj == null;
  }

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  function errorify(obj, method, type) {
    return new Error('Argument ' + (obj && obj.toString()) + ' in "' + method + '" function is not a ' + type + '!');
  }

  function each(defer, array, iterator, context) {
    var i, end, total, _defer, resultArray = [];

    function next(index, err, result) {
      total -= 1;
      if (isNull(err)) {
        resultArray[index] = result;
        if (total <= 0) {
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'each', 'array'));
    } else if (!isFunction(iterator)) {
      return defer(errorify(iterator, 'each', 'function'));
    } else {
      total = end = array.length;
      if (total) {
        for (i = 0; i < end; i++) {
          _defer = next.bind(null, i);
          _defer.nextThenObject = emptyThen;
          iterator.call(context, _defer, array[i], i, array);
        }
      } else {
        return defer(null, resultArray);
      }
    }
  }

  function eachSeries(defer, array, iterator, context) {
    var end, i = -1, resultArray = [];

    function next(err, result) {
      i += 1;
      if (isNull(err)) {
        resultArray[i - 1] = result;
        if (i < end) {
          return iterator.call(context, next, array[i], i, array);
        } else {
          delete resultArray[-1];
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'eachSeries', 'array'));
    } else if (!isFunction(iterator)) {
      return defer(errorify(iterator, 'eachSeries', 'function'));
    } else {
      end = array.length;
      if (end) {
        next.nextThenObject = emptyThen;
        return next();
      } else {
        return defer(null, resultArray);
      }
    }
  }

  function parallel(defer, array, context) {
    var i, end, total, _defer, resultArray = [];

    function next(index, err, result) {
      total -= 1;
      if (isNull(err)) {
        resultArray[index] = result;
        if (total <= 0) {
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'parallel', 'array'));
    } else {
      total = end = array.length;
      if (!total) {
        return defer(null, resultArray);
      } else {
        for (i = 0; i < end; i++) {
          if (isFunction(array[i])) {
            _defer = next.bind(null, i);
            _defer.nextThenObject = emptyThen;
            array[i].call(context, _defer, i);
          } else {
            return defer(errorify(array[i], 'parallel', 'function'));
          }
        }
      }
    }
  }

  function series(defer, array, context) {
    var end, i = -1,
      resultArray = [];

    function next(err, result) {
      i += 1;
      if (isNull(err)) {
        resultArray[i - 1] = result;
        if (i < end) {
          if (isFunction(array[i])) {
            return array[i].call(context, next, i);
          } else {
            return defer(errorify(array[i], 'series', 'function'));
          }
        } else {
          delete resultArray[-1];
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'series', 'array'));
    } else {
      end = array.length;
      if (end) {
        next.nextThenObject = emptyThen;
        return next();
      } else {
        return defer(null, resultArray);
      }
    }
  }

  function tryNextTick(defer, fn) {
    nextTick(function () {
      try {
        fn();
      } catch (error) {
        defer(error);
      }
    });
  }

  function createHandler(defer, handler) {
    return isFunction(handler) ? handler.nextThenObject ? handler : handler.bind(null, defer) : null;
  }

  function closurePromise(debug) {
    var fail = [], chain = 0,
      Promise = function () {},
      prototype = Promise.prototype;

    function promiseFactory(fn, context) {
      var promise = new Promise(),
        defer = promise.defer.bind(promise);
      defer.nextThenObject = promise;
      fn(defer, context);
      return promise;
    }

    prototype.debug = !debug || isFunction(debug) ? debug :
      typeof console === 'object' && console.log && function () {
        console.log.apply(console, arguments);
      };
    prototype.all = function (allHandler) {
      return promiseFactory(function (defer, self) {
        self._all = createHandler(defer, allHandler);
      }, this);
    };
    prototype.then = function (successHandler, errorHandler) {
      return promiseFactory(function (defer, self) {
        self._success = createHandler(defer, successHandler);
        self._error = createHandler(defer, errorHandler);
      }, this);
    };
    prototype.fail = function (errorHandler) {
      return promiseFactory(function (defer, self) {
        self._fail = createHandler(defer, errorHandler);
        self._success = defer.bind(defer, null);
        if (self._fail) {
          fail.push(self._fail);
        }
      }, this);
    };
    prototype.each = function (array, iterator, context) {
      return promiseFactory(function (defer, self) {
        self._each = function (dArray, dIterator, dContext) {
          each(defer, array || dArray, iterator || dIterator, context || dContext);
        };
      }, this);
    };
    prototype.eachSeries = function (array, iterator, context) {
      return promiseFactory(function (defer, self) {
        self._eachSeries = function (dArray, dIterator, dContext) {
          eachSeries(defer, array || dArray, iterator || dIterator, context || dContext);
        };
      }, this);
    };
    prototype.parallel = function (array, context) {
      return promiseFactory(function (defer, self) {
        self._parallel = function (dArray, dContext) {
          parallel(defer, array || dArray, context || dContext);
        };
      }, this);
    };
    prototype.series = function (array, context) {
      return promiseFactory(function (defer, self) {
        self._series = function (dArray, dContext) {
          series(defer, array || dArray, context || dContext);
        };
      }, this);
    };
    prototype.defer = function (err) {
      var _this = this, _arguments = arguments;
      chain += 1;
      _this._error = _this._fail ? fail.shift() : _this._error;
      _this._success = _this._success || _this._each || _this._eachSeries || _this._parallel || _this._series || NOOP;

      function execute() {
        if (_this.debug) {
          var args = slice.call(_arguments);
          args.unshift('\nResult of chain ' + chain + ':');
          _this.debug.apply(_this.debug, args);
        }
        if (_this._all) {
          _this._all.apply(_this._all.nextThenObject, slice.call(_arguments));
        } else if (isNull(err)) {
          _this._success.apply(_this._success.nextThenObject, slice.call(_arguments, 1));
        } else {
          throw err;
        }
      }
      function dealError(error) {
        error.stack = error.stack || error.description;
        if (_this._error || fail.length) {
          _this._error = _this._error || fail.shift();
          _this._error.call(_this._error.nextThenObject, error);
        } else {
          throw error;
        }
      }

      try {
        execute();
      } catch (error) {
        dealError(error);
      } finally {
        _this._all = NOOP;
      }
    };
    return promiseFactory;
  }

  function eachAndSeriesFactory(fn) {
    return function (array, iterator, context, debug) {
      return closurePromise(debug)(function (defer) {
        tryNextTick(defer, fn.bind(null, defer, array, iterator, context));
      });
    };
  }

  function parallelAndSeriesFactory(fn) {
    return function (array, context, debug) {
      return closurePromise(debug)(function (defer) {
        tryNextTick(defer, fn.bind(null, defer, array, context));
      });
    };
  }

  function thenjs(startFn, context, debug) {
    return closurePromise(debug)(function (defer) {
      tryNextTick(defer, isFunction(startFn) ? startFn.bind(context, defer) : defer);
    });
  }

  thenjs.each = eachAndSeriesFactory(each);
  thenjs.eachSeries = eachAndSeriesFactory(eachSeries);
  thenjs.parallel = parallelAndSeriesFactory(parallel);
  thenjs.series = parallelAndSeriesFactory(series);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = thenjs;
  } else if (typeof define === 'function') {
    define(function () {return thenjs;});
  }
  if (typeof window === 'object') {
    window.then = thenjs;
  }
})();
