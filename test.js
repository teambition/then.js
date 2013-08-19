'use strict';
/*global module, process*/

var testThen = (function(){function h(){}function b(k){function e(d,a){return"function"===typeof a?a._isDeferOfThen?a:a.bind(null,d.defer.bind(d)):null}var f=[],a=h,c="object"===typeof process&&process.nextTick?process.nextTick:setTimeout;a.prototype.all=function(d){var b=new a;this._all=e(b,d);return b};a.prototype.then=function(d,b){var c=new a;this._success=e(c,d)||h;this._error=e(c,b);return c};a.prototype.fail=function(d){var b=new a;(d=e(b,d))&&f.push(d);return b};a.prototype.defer=function(a){if(this._all)this._all.apply(null,l.call(arguments));else if(null===a||void 0===a)this._success.apply(null,l.call(arguments,1));else{if(this._error||0<f.length)return this._error?this._error(a):f.shift()(a);throw a;}};a.prototype.defer._isDeferOfThen=!0;var g=new a,b=g.defer.bind(g);c("function"===typeof k?k.bind(null,b):b);return g}var l=Array.prototype.slice;b.each=function(b,e,f){function a(){c+=1;e.call(f,c<g?a:null,b[c],c,b)}var c=-1,g=b.length-1;e=e||h;a()};"object"===typeof module?module.exports=b:"object"===typeof window&&(window.then=b);return b})();

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