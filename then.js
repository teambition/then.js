'use strict';
/*global module, define, process, console*/

/**
 * then.js, version 0.9.2, 2013/09/22
 * Another very small asynchronous promise tool!
 * https://github.com/teambition/then.js, admin@zensh.com
 * License: MIT
 */

(function () {
    var slice = [].slice,
        isArray = Array.isArray,
        nextTick = typeof process === 'object' && isFunction(process.nextTick) ? process.nextTick : setTimeout;

    function noop() {}
    function isNull(obj) {
        return obj === null || typeof obj === 'undefined';
    }
    function isFunction(fn) {
        return typeof fn === 'function';
    }
    function getError(obj, method, type) {
        return new Error('Argument ' + obj + ' in "' + method + '" function is not a ' + type + '!');
    }
    function each(defer, array, iterator, context) {
        var i, end, total, resultArray = [];

        function next(index, err, result) {
            total -= 1;
            resultArray[index] = result;
            if (total <= 0 || !isNull(err)) {
                defer(err || null, resultArray);
            }
        }

        next._next_then = {};
        if (!isArray(array)) {
            defer(getError(array, 'each', 'array'));
        } else if (!isFunction(iterator)) {
            defer(getError(iterator, 'each', 'function'));
        } else {
            total = end = array.length;
            if (!total) {
                defer(null, resultArray);
            } else {
                for (i = 0; i < end; i++) {
                    iterator.call(context, next.bind(null, i), array[i], i, array);
                }
            }
        }
    }
    function eachSeries(defer, array, iterator, context) {
        var end, i = -1, resultArray = [];

        function next(err, result) {
            resultArray[i] = result;
            i += 1;
            if (i < end && isNull(err)) {
                iterator.call(context, next, array[i], i, array);
            } else {
                delete resultArray[-1];
                defer(err || null, resultArray);
            }
        }

        next._next_then = {};
        if (!isArray(array)) {
            defer(getError(array, 'eachSeries', 'array'));
        } else if (!isFunction(iterator)) {
            defer(getError(iterator, 'eachSeries', 'function'));
        } else {
            end = array.length;
            if (!end) {
                defer(null, resultArray);
            } else {
                next();
            }
        }
    }
    function parallel(defer, array, context) {
        var i, end, total, resultArray = [];

        function next(index, err, result) {
            total -= 1;
            resultArray[index] = result;
            if (total <= 0 || !isNull(err)) {
                defer(err || null, resultArray);
            }
        }

        next._next_then = {};
        if (!isArray(array)) {
            defer(getError(array, 'parallel', 'array'));
        } else {
            total = end = array.length;
            if (!total) {
                defer(null, resultArray);
            } else {
                for (i = 0; i < end; i++) {
                    if (isFunction(array[i])) {
                        array[i].call(context, next.bind(null, i), i);
                    } else {
                        defer(getError(array[i], 'parallel', 'function'));
                    }
                }
            }
        }
    }
    function series(defer, array, context) {
        var end, i = -1,
            resultArray = [];

        function next(err, result) {
            resultArray[i] = result;
            i += 1;
            if (i < end && isNull(err)) {
                if (isFunction(array[i])) {
                    array[i].call(context, next, i);
                } else {
                    defer(getError(array[i], 'series', 'function'));
                }
            } else {
                delete resultArray[-1];
                defer(err || null, resultArray);
            }
        }

        next._next_then = {};
        if (!isArray(array)) {
            defer(getError(array, 'series', 'array'));
        } else {
            end = array.length;
            if (!end) {
                defer(null, resultArray);
            } else {
                next();
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
        return isFunction(handler) ? (handler._next_then ? handler : handler.bind(null, defer)) : null;
    }
    function closurePromise(debug) {
        var fail = [], chain = 0,
            Promise = function () {},
            prototype = Promise.prototype;

        function promiseFactory(fn, context) {
            var promise = new Promise(),
                defer = promise.defer.bind(promise);
            defer._next_then = promise;
            fn(defer, context);
            return promise;
        }

        prototype.debug = debug;
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
            chain += 1;
            this._error = this._fail ? fail.shift() : this._error;
            this._success = this._success || this._each || this._eachSeries || this._parallel || this._series || noop;
            try {
                if (this.debug) {
                    var args = slice.call(arguments);
                    args.unshift('Then chain ' + chain + ':');
                    if (isFunction(this.debug)) {
                        this.debug.apply(this.debug, args);
                    } else if (typeof console === 'object' && isFunction(console.log)) {
                        console.log.apply(console, args);
                    }
                }
                if (this._all) {
                    this._all.apply(this._all._next_then, slice.call(arguments));
                } else if (isNull(err)) {
                    this._success.apply(this._success._next_then, slice.call(arguments, 1));
                } else {
                    throw err;
                }
            } catch (error) {
                if (this._error || fail.length) {
                    (this._error ? this._error : fail.shift())(error);
                } else {
                    throw error;
                }
            } finally {
                this._all = noop;
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
        define(function () {
            return thenjs;
        });
    }
    if (typeof window === 'object') {
        window.then = thenjs;
    }
    return thenjs;
})();