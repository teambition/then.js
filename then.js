'use strict';
/*global module, define, process*/

/*!
 * then.js, version 0.8.2, 2013/09/08
 * Another very small asynchronous promise tool!
 * https://github.com/teambition/then.js
 * MIT license, admin@zensh.com
 */

(function () {
    var slice = [].slice,
        isArray = Array.isArray,
        nextTick = typeof process === 'object' && isFunction(process.nextTick) ? process.nextTick : setTimeout;

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

        next._this_then = true;
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
        var end, i = -1,
            resultArray = [];

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

        next._this_then = true;
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

        next._this_then = true;
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

        next._this_then = true;
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

    function thenjs(startFn, context) {
        var fail = [],
            Promise = function () {},
            prototype = Promise.prototype;

        function promiseFactory(fn, context) {
            var promise = new Promise(),
                defer = promise.defer.bind(promise);
            defer._this_then = promise;
            fn(defer, context);
            return promise;
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

        function eachAndSeriesFactory(fn) {
            return function (array, iterator, context) {
                return promiseFactory(function (defer) {
                    tryNextTick(defer, fn.bind(null, defer, array, iterator, context));
                });
            };
        }

        function parallelAndSeriesFactory(fn) {
            return function (array, context) {
                return promiseFactory(function (defer) {
                    tryNextTick(defer, fn.bind(null, defer, array, context));
                });
            };
        }

        function createHandler(defer, handler) {
            return isFunction(handler) ? (handler._this_then ? handler : handler.bind(null, defer)) : null;
        }

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
            this._error = this._fail ? fail.shift() : this._error;
            if (this._all) {
                try {
                    this._all.apply(this._all._this_then, slice.call(arguments));
                    err = null;
                } catch (error) {
                    err = error;
                }
            } else if (isNull(err)) {
                this._success = this._success || this._each || this._eachSeries || this._parallel || this._series;
                try {
                    return this._success && this._success.apply(this._success._this_then, slice.call(arguments, 1));
                } catch (error) {
                    err = error;
                }
            }
            if (!isNull(err)) {
                if (this._error || fail.length) {
                    return this._error ? this._error(err) : fail.shift()(err);
                } else {
                    throw err;
                }
            }
        };

        thenjs.each = eachAndSeriesFactory(each);
        thenjs.eachSeries = eachAndSeriesFactory(eachSeries);
        thenjs.parallel = parallelAndSeriesFactory(parallel);
        thenjs.series = parallelAndSeriesFactory(series);

        return promiseFactory(function (defer) {
            tryNextTick(defer, isFunction(startFn) ? startFn.bind(context, defer) : defer);
        });
    }

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