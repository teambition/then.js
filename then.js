'use strict';
/*global global, module, exports, process*/

/*!
 * then.js, version 0.1.0, 2013/08/13
 * The smallest promise!
 * https://github.com/zensh/then.js
 * (c) admin@zensh.com 2013
 * License: MIT
 */

(function (global) {

    if (typeof exports === 'object') {
        module.exports = then;
    } else {
        global.then = then;
    }

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    function Promise() {
        this._error = this._success = function () {};
    }
    Promise.prototype.defer = function (err) {
        if (err === null || err === undefined) {
            this._success.apply(null, Array.prototype.slice.call(arguments, 1));
        } else {
            this._error(err);
        }
    };
    Promise.prototype.then = function (successFn, errorFn) {
        var that = new Promise(),
            defer = that.defer.bind(that);
        this._success = isFunction(successFn) ? successFn.bind(null, defer) : this._success;
        this._error = isFunction(errorFn) ? errorFn.bind(null, defer) : this._error;
        return that;
    };

    function then(fn) {
        var that = new Promise(),
            nextTick = global.process && global.process.nextTick || setTimeout;

        if (isFunction(fn)) {
            nextTick(fn.bind(null, that.defer.bind(that)));
        }
        return that;
    }
})(window || global);