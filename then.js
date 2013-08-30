'use strict';
/*global module, process*/

/*!
 * then.js, version 0.6.3, 2013/08/30
 * Another very small promise!
 * https://github.com/zensh/then.js
 * (c) admin@zensh.com 2013
 * License: MIT
 */

(function () {
    var slice = [].slice;

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
                return this._all.apply(this._all._next_then || null, slice.call(arguments));
            } else if (err === null || err === undefined) {
                return this._success && this._success.apply(this._success._next_then || null, slice.call(arguments, 1));
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

    thenjs.each = function (array, iterator, context) {
        var i = -1, end;

        function next() {
            i += 1;
            iterator.call(context, i < end ? next : null, array[i], i, array);
        }

        iterator = iterator || function () {};
        if (Array.isArray(array)) {
            end = array.length - 1;
            next();
        } else {
            throw new Error('First argument ' + array + ' is not a array!');
        }
    };

    if (typeof module === 'object') {
        module.exports = thenjs;
    } else if (typeof window === 'object') {
        window.then = thenjs;
    }
    return thenjs;
})();