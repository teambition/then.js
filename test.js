'use strict';
/*global module, process*/

var testThen = (function () {
    var fail;

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    function Promise() {
        this._success = function () {};
    }
    Promise.prototype.defer = function (err) {
        if (err === null || err === undefined) {
            this._success.apply(null, Array.prototype.slice.call(arguments, 1));
        } else if (fail || this._error) {
            return this._error ? this._error(err) : fail(err);
        } else {
            throw err;
        }
    };
    Promise.prototype.then = function (successHandler, errorHandler) {
        var that = new Promise(),
            defer = that.defer.bind(that);
        this._success = isFunction(successHandler) ? successHandler.bind(null, defer) : this._success;
        this._error = isFunction(errorHandler) && errorHandler.bind(null, defer);
        return that;
    };
    Promise.prototype.fail = function (errorHandler) {
        fail = isFunction(errorHandler) && errorHandler;
    };

    function then(startFn) {
        var that = new Promise(),
            defer = that.defer.bind(that),
            nextTick = typeof process === 'object' ? process.nextTick : setTimeout;

        nextTick(isFunction(startFn) ? startFn.bind(null, defer) : defer);
        return that;
    }

    if (typeof module === 'object') {
        module.exports = then;
    } else if (typeof window === 'object') {
        window.then = then;
    }
    return then;
})();

// TEST begin

function asnycTask(n, callback) {
    setTimeout(function () {
        callback(null, n);
    }, n * 1000);
}

testThen(function (defer) {
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
}).fail(function (err) {
    console.log(666, err);
});
// TEST end
