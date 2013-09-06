'use strict';
/*global module, define, process*/

/*!
 * then.js, version 0.8.0, 2013/09/08
 * Another very small promise!
 * https://github.com/zensh/then.js
 * MIT license, admin@zensh.com
 */

(function () {
    var slice = [].slice,
        isArray = Array.isArray;

    function isNull(obj) {
        return obj === null || typeof obj === 'undefined';
    }

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    function getError(obj, type, method) {
        return new Error('Argument ' + obj + ' in "' + method + '" function is not a ' + type + '!');
    }

    function each(defer, array, iterator, context) {
        var i, end, total,
            resultArray = [];

        function next(index, err, result) {
            total -= 1;
            resultArray[index] = result;
            if (!total || !isNull(err)) {
                defer(err, resultArray);
            }
        }
        if (!isArray(array)) {
            defer(getError(array, 'array', 'each'));
        } else if (!isFunction(iterator)) {
            defer(getError(iterator, 'function', 'each'));
        } else {
            total = end = array.length;
            for (i = 0; i < end; i++) {
                iterator.call(context, next.bind(null, i), array[i], i, array);
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
                defer(err, resultArray);
            }
        }

        if (!isArray(array)) {
            defer(getError(array, 'array', 'eachSeries'));
        } else if (!isFunction(iterator)) {
            defer(getError(iterator, 'function', 'eachSeries'));
        } else {
            end = array.length;
            next();
        }
    }

    function parallel(defer, array, context) {
        var i, end, total,
            resultArray = [];

        function next(index, err, result) {
            total -= 1;
            resultArray[index] = result;
            if (!total || !isNull(err)) {
                defer(err, resultArray);
            }
        }

        if (!isArray(array)) {
            defer(getError(array, 'array', 'parallel'));
        } else {
            total = end = array.length;
            for (i = 0; i < end; i++) {
                if (isFunction(array[i])) {
                    array[i].call(context, next.bind(null, i));
                } else {
                    total -= 1;
                    resultArray[i] = array[i];
                }
            }
            if (!total) {
                defer(null, resultArray);
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
                    array[i].call(context, next);
                } else {
                    next(null, array[i]);
                }
            } else {
                delete resultArray[-1];
                defer(err, resultArray);
            }
        }

        if (!isArray(array)) {
            defer(getError(array, 'array', 'parallel'));
        } else {
            end = array.length;
            next();
        }
    }

    function thenjs(startFn) {
        var fail = [],
            Promise = function () {},
            prototype = Promise.prototype,
            nextTick = typeof process === 'object' && isFunction(process.nextTick) ? process.nextTick : setTimeout;

        function promiseFactory(fn, context) {
            var promise = new Promise(),
                defer = promise.defer.bind(promise);
            defer._next_then = promise;
            fn(defer, context);
            return promise;
        }

        function createHandler(defer, handler) {
            return isFunction(handler) ? (handler._next_then ? handler : handler.bind(null, defer)) : null;
        }

        function esFactory(fn) {
            return function (array, iterator, context) {
                return promiseFactory(function (defer) {
                    nextTick(fn.bind(null, defer, array, iterator, context));
                });
            };
        }

        function psFactory(fn) {
            return function (array, context) {
                return promiseFactory(function (defer) {
                    nextTick(fn.bind(null, defer, array, context));
                });
            };
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
                    each(defer, array || dArray, iterator || dIterator, context || dContext);
                };
            }, this);
        };
        prototype.parallel = function (array, context) {
            return promiseFactory(function (defer, self) {
                self._parallel = function (dArray, dContext) {
                    each(defer, array || dArray, context || dContext);
                };
            }, this);
        };
        prototype.series = function (array, context) {
            return promiseFactory(function (defer, self) {
                self._series = function (dArray, dContext) {
                    each(defer, array || dArray, context || dContext);
                };
            }, this);
        };
        prototype.defer = function (err) {
            this._error = this._fail ? fail.shift() : this._error;
            if (this._all) {
                return this._all.apply(this._all._next_then, slice.call(arguments));
            } else if (isNull(err)) {
                this._success = this._success || this._each || this._eachSeries || this._parallel || this._series;
                return this._success && this._success.apply(this._success._next_then, slice.call(arguments, 1));
            } else if (this._error || fail.length) {
                return this._error ? this._error(err) : fail.shift()(err);
            } else {
                throw err;
            }
        };

        thenjs.each = esFactory(each);
        thenjs.eachSeries = esFactory(eachSeries);
        thenjs.parallel = psFactory(parallel);
        thenjs.series = psFactory(series);

        return promiseFactory(function (defer) {
            nextTick(isFunction(startFn) ? startFn.bind(null, defer) : defer);
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