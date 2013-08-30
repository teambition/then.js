'use strict';
/*global module, process*/

var testThen = (function(){function a(k){function e(b,c){var d=b.defer.bind(b);d._next_then=b;return"function"===typeof c?c._next_then?c:c.bind(null,d):null}var h=[],d=function(){},f="object"===typeof process&&process.nextTick?process.nextTick:setTimeout;d.prototype.all=function(b){var c=new d;this._all=e(c,b);return c};d.prototype.then=function(b,c){var a=new d;this._success=e(a,b);this._error=e(a,c);return a};d.prototype.fail=function(b){var c=new d;this._fail=e(c,b);this._success=c.defer.bind(c,null);this._fail&&
h.push(this._fail);return c};d.prototype.defer=function(b){this._error=this._fail?h.shift():this._error;if(this._all)return this._all.apply(this._all._next_then||null,l.call(arguments));if(null===b||void 0===b)return this._success&&this._success.apply(this._success._next_then||null,l.call(arguments,1));if(this._error||h.length)return this._error?this._error(b):h.shift()(b);throw b;};var g=new d,a=g.defer.bind(g);a._next_then=g;f("function"===typeof k?k.bind(null,a):a);return g}var l=[].slice;a.each=
function(a,e,h){function d(){f+=1;e.call(h,f<g?d:null,a[f],f,a)}var f=-1,g;e=e||function(){};if(Array.isArray(a))g=a.length-1,d();else throw Error("First argument "+a+" is not a array!");};"object"===typeof module?module.exports=a:"object"===typeof window&&(window.then=a);return a})();

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
