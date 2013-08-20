'use strict';
/*global module, process*/

var testThen = (function () {
    function k() {}

    function a(l) {
        function e(b, c) {
            var d = b.defer.bind(b);
            d._this_then = b;
            return "function" === typeof c ? c._this_then ? c : c.bind(null, d) : null
        }
        var g = [],
            d = k,
            f = "object" === typeof process && process.nextTick ? process.nextTick : setTimeout;
        d.prototype.all = function (b) {
            var c = new d;
            this._all = e(c, b);
            return c
        };
        d.prototype.then = function (b, c) {
            var a = new d;
            this._success = e(a, b) || k;
            this._error = e(a, c);
            return a
        };
        d.prototype.fail = function (b) {
            var c = new d;
            this._fail = e(c, b);
            this._success = c.defer.bind(c, null);
            this._fail &&
                g.push(this._fail);
            return c
        };
        d.prototype.defer = function (b) {
            this._error = this._fail ? g.shift() : this._error;
            if (this._all) this._all.apply(this._all._this_then || null, m.call(arguments));
            else if (null === b || void 0 === b) this._success.apply(this._success._this_then || null, m.call(arguments, 1));
            else {
                if (this._error || 0 < g.length) return this._error ? this._error(b) : g.shift()(b);
                throw b;
            }
        };
        var h = new d,
            a = h.defer.bind(h);
        a._this_then = h;
        f("function" === typeof l ? l.bind(null, a) : a);
        return h
    }
    var m = Array.prototype.slice;
    a.each =
        function (a, e, g) {
            function d() {
                f += 1;
                e.call(g, f < h ? d : null, a[f], f, a)
            }
            var f = -1,
                h = a.length - 1;
            e = e || k;
            d()
    };
    "object" === typeof module ? module.exports = a : "object" === typeof window && (window.then = a);
    return a
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
    defer('Error1!');
}).then(function (defer) {
    console.log(555);
    defer('Error2!');
}).fail(function (defer, err) {
    console.log(666, err);
    defer(null, 'aaa');
}).then(function (defer, a) {
    console.log(777, a);
    defer('Error3!');
}).fail(function (defer, err) {
    console.log(888, err);
});
// TEST end
