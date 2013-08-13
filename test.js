'use strict';
/*global global, module, exports*/

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


/* TEST */

function asnycTask(n, callback) {
    setTimeout(function () {
        callback(null, n);
    }, n * 1000);
}

then(function (defer) {
    console.log(111);
    asnycTask(1, defer);
}).then(function (defer, a) {
    console.log(222, a);
    asnycTask(2, defer);
}).then(function (defer, a) {
    console.log(333, a);
    asnycTask(3, function (err, b) {
        console.log(3332, err, b);
        defer(null, 'hello!', b);
    });
}).then(function (defer, a, b) {
    console.log(444, a, b);
    defer('Error!');
}).then(null, function (defer, err) {
    console.log(555, err);
});