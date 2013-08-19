'use strict';
/*global module, process*/

/*!
 * then.js, version 0.5.0, 2013/08/19
 * Another very small promise!
 * https://github.com/zensh/then.js
 * (c) admin@zensh.com 2013
 * License: MIT
 */

(function () {
    var slice = Array.prototype.slice;

    function noop() {}

    function then(startFn) {
        var fail = [],
            Promise = noop,
            nextTick = typeof process === 'object' && process.nextTick ? process.nextTick : setTimeout;

        function createHandler(promise, handler) {
            return typeof handler === 'function' ? (handler._isDeferOfThen ? handler : handler.bind(null, promise.defer.bind(promise))) : null;
        }

        Promise.prototype.all = function (allHandler) {
            var promise = new Promise();
            this._all = createHandler(promise, allHandler);
            return promise;
        };
        Promise.prototype.then = function (successHandler, errorHandler) {
            var promise = new Promise();
            this._success = createHandler(promise, successHandler) || noop;
            this._error = createHandler(promise, errorHandler);
            return promise;
        };
        Promise.prototype.fail = function (errorHandler) {
            var promise = new Promise(),
                handler = createHandler(promise, errorHandler);

            if (handler) {
                fail.push(handler);
            }
            return promise;
        };
        Promise.prototype.defer = function (err) {
            if (this._all) {
                this._all.apply(null, slice.call(arguments));
            } else if (err === null || err === undefined) {
                this._success.apply(null, slice.call(arguments, 1));
            } else if (this._error || fail.length > 0) {
                return this._error ? this._error(err) : fail.shift()(err);
            } else {
                throw err;
            }
        };
        Promise.prototype.defer._isDeferOfThen = true;

        var promise = new Promise(),
            defer = promise.defer.bind(promise);

        nextTick(typeof startFn === 'function' ? startFn.bind(null, defer) : defer);
        return promise;
    }

    then.each = function (array, iterator, context) {
        var i = -1,
            end = array.length - 1;

        iterator = iterator || noop;
        next();

        function next() {
            i += 1;
            iterator.call(context, i < end ? next : null, array[i], i, array);
        }
    };

    if (typeof module === 'object') {
        module.exports = then;
    } else if (typeof window === 'object') {
        window.then = then;
    }
    return then;
})();