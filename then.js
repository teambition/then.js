'use strict';
/*global module, define, process*/

/*!
 * then.js, version 0.7.0, 2013/09/05
 * Another very small promise!
 * https://github.com/zensh/then.js
 * (c) admin@zensh.com 2013
 * License: MIT
 */

(function () {
    var slice = [].slice;

    function noop() {}

    function wrapCallback(callback) {
        if (typeof callback === 'function') {
            return callback;
        } else {
            return function (err) {
                throw err;
            };
        }
    }

    function isNull(obj) {
        return obj === null || typeof obj === 'undefined';
    }

    function checkArray(array) {
        if (Array.isArray(array)) {
            return true;
        } else {
            throw new Error('First argument ' + array + ' is not a array!');
        }
    }

    function thenjs(startFn) {
        var fail = [],
            Promise = function () {},
            nextTick = typeof process === 'object' && process.nextTick ? process.nextTick : setTimeout;

        function createHandler(promise, handler) {
            var defer = promise.defer.bind(promise);
            defer._next_then = promise;
            return typeof handler === 'function' ? (handler._next_then ? handler : handler.bind(null, defer)) : null;
        }

        Promise.prototype.all = function (allHandler) {
            var promise = new Promise();
            this._all = createHandler(promise, allHandler);
            return promise;
        };
        Promise.prototype.then = function (successHandler, errorHandler) {
            var promise = new Promise();
            this._success = createHandler(promise, successHandler);
            this._error = createHandler(promise, errorHandler);
            return promise;
        };
        Promise.prototype.fail = function (errorHandler) {
            var promise = new Promise();
            this._fail = createHandler(promise, errorHandler);
            this._success = promise.defer.bind(promise, null);
            if (this._fail) {
                fail.push(this._fail);
            }
            return promise;
        };
        Promise.prototype.defer = function (err) {
            this._error = this._fail ? fail.shift() : this._error;
            if (this._all) {
                return this._all.apply(this._all._next_then, slice.call(arguments));
            } else if (isNull(err)) {
                return this._success && this._success.apply(this._success._next_then, slice.call(arguments, 1));
            } else if (this._error || fail.length) {
                return this._error ? this._error(err) : fail.shift()(err);
            } else {
                throw err;
            }
        };

        var promise = new Promise(),
            defer = promise.defer.bind(promise);
        defer._next_then = promise;
        nextTick(typeof startFn === 'function' ? startFn.bind(null, defer) : defer);
        return promise;
    }

    thenjs.each = function (array, iterator, callback, context) {
        var i, end, total,
            resultArray = [];

        function defer(index, err, result) {
            total -= 1;
            resultArray[index] = result;
            if (!total || !isNull(err)) {
                callback(err, resultArray);
            }
        }

        callback = wrapCallback(callback);
        if (checkArray(array)) {
            total = end = array.length;
            for (i = 0; i < end; i++) {
                iterator.call(context, defer.bind(null, i), array[i], i, array);
            }
        }
    };

    thenjs.eachSeries = function (array, iterator, callback, context) {
        var end, i = -1,
            resultArray = [];

        function defer(err, result) {
            resultArray[i] = result;
            i += 1;
            if (i < end && isNull(err)) {
                iterator.call(context, defer, array[i], i, array);
            } else {
                delete resultArray[-1];
                callback(err, resultArray);
            }
        }

        callback = wrapCallback(callback);
        if (checkArray(array)) {
            end = array.length;
            defer();
        }
    };

    thenjs.parallel = function (array, callback) {
        var i, end, total,
            resultArray = [];

        function defer(index, err, result) {
            total -= 1;
            resultArray[index] = result;
            if (!total || !isNull(err)) {
                callback(err, resultArray);
            }
        }

        callback = wrapCallback(callback);
        if (checkArray(array)) {
            total = end = array.length;
            for (i = 0; i < end; i++) {
                if (typeof array[i] === 'function') {
                    array[i].call(null, defer.bind(null, i));
                } else {
                    total -= 1;
                    resultArray[i] = array[i];
                }
            }
            if (!total) {
                callback(null, resultArray);
            }
        }
    };

    thenjs.series = function (array, callback) {
        var end, i = -1,
            resultArray = [];

        function defer(err, result) {
            resultArray[i] = result;
            i += 1;
            if (i < end && isNull(err)) {
                if (typeof array[i] === 'function') {
                    array[i].call(null, defer);
                } else {
                    defer(null, array[i]);
                }
            } else {
                delete resultArray[-1];
                callback(err, resultArray);
            }
        }

        callback = wrapCallback(callback);
        if (checkArray(array)) {
            end = array.length;
            defer();
        }
    };

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