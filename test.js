'use strict';
/*global module, process*/

var testThen = (function(){function p(b){return null===b||"undefined"===typeof b}function k(b){return"function"===typeof b}function l(b,a,d){return Error("Argument "+b+' in "'+a+'" function is not a '+d+"!")}function v(b,a,d,f){function e(a,g,c){h-=1;m[a]=c;(0>=h||!p(g))&&b(g||null,m)}var c,g,h,m=[];e._this_then=!0;if(q(a))if(k(d))if(h=g=a.length)for(c=0;c<g;c++)d.call(f,e.bind(null,c),a[c],c,a);else b(null,m);else b(l(d,"each","function"));else b(l(a,"each","array"))}function w(b,a,d,f){function e(m,B){h[g]=B;
g+=1;g<c&&p(m)?d.call(f,e,a[g],g,a):(delete h[-1],b(m||null,h))}var c,g=-1,h=[];e._this_then=!0;q(a)?k(d)?(c=a.length)?e():b(null,h):b(l(d,"eachSeries","function")):b(l(a,"eachSeries","array"))}function x(b,a,d){function f(a,c,d){g-=1;h[a]=d;(0>=g||!p(c))&&b(c||null,h)}var e,c,g,h=[];f._this_then=!0;if(q(a))if(g=c=a.length)for(e=0;e<c;e++)k(a[e])?a[e].call(d,f.bind(null,e),e):b(l(a[e],"parallel","function"));else b(null,h);else b(l(a,"parallel","array"))}function y(b,a,d){function f(h,m){g[c]=m;c+=
1;c<e&&p(h)?k(a[c])?a[c].call(d,f,c):b(l(a[c],"series","function")):(delete g[-1],b(h||null,g))}var e,c=-1,g=[];f._this_then=!0;q(a)?(e=a.length)?f():b(null,g):b(l(a,"series","array"))}function s(b,a){C(function(){try{a()}catch(d){b(d)}})}function r(b,a){return k(a)?a._this_then?a:a.bind(null,b):null}function t(b){function a(a,b){var c=new e,d=c.defer.bind(c);d._this_then=c;a(d,b);return c}var d=[],f=0,e=function(){},c=e.prototype;c.debug=b;c.all=function(c){return a(function(a,b){b._all=r(a,c)},
this)};c.then=function(c,b){return a(function(a,d){d._success=r(a,c);d._error=r(a,b)},this)};c.fail=function(c){return a(function(a,b){b._fail=r(a,c);b._success=a.bind(a,null);b._fail&&d.push(b._fail)},this)};c.each=function(b,c,d){return a(function(a,e){e._each=function(e,f,k){v(a,b||e,c||f,d||k)}},this)};c.eachSeries=function(b,c,d){return a(function(a,e){e._eachSeries=function(e,f,k){w(a,b||e,c||f,d||k)}},this)};c.parallel=function(b,c){return a(function(a,d){d._parallel=function(d,e){x(a,b||d,
c||e)}},this)};c.series=function(b,c){return a(function(a,d){d._series=function(d,e){y(a,b||d,c||e)}},this)};c.defer=function(a){f+=1;this._error=this._fail?d.shift():this._error;this._success=this._success||this._each||this._eachSeries||this._parallel||this._series;if(this.debug){var b=u.call(arguments);b.unshift("Then chain "+f+":");k(this.debug)?this.debug.apply(this.debug,b):"object"===typeof console&&k(console.log)&&console.log.apply(console,b)}if(this._all)try{this._all.apply(this._all._this_then,
u.call(arguments)),a=null}catch(c){a=c}else if(p(a)&&this._success)try{this._success.apply(this._success._this_then,u.call(arguments,1))}catch(e){a=e}if(!p(a))if(this._error||d.length)(this._error?this._error:d.shift())(a);else throw a;this._all=function(){}};return a}function z(b){return function(a,d,f,e){return t(e)(function(c){s(c,b.bind(null,c,a,d,f))})}}function A(b){return function(a,d,f){return t(f)(function(e){s(e,b.bind(null,e,a,d))})}}function n(b,a,d){return t(d)(function(d){s(d,k(b)?b.bind(a,
d):d)})}var u=[].slice,q=Array.isArray,C="object"===typeof process&&k(process.nextTick)?process.nextTick:setTimeout;n.each=z(v);n.eachSeries=z(w);n.parallel=A(x);n.series=A(y);"undefined"!==typeof module&&module.exports?module.exports=n:"function"===typeof define&&define(function(){return n});"object"===typeof window&&(window.then=n);return n})();
// TEST begin

function asnycTask(index, callback) {
    var s = Math.random() * 1000 * index;
    setTimeout(function () {
        console.log(index);
        callback(null, index, s);
    }, s);
}

testThen(function (defer) {
    //只响应返回结果最快的一个函数
    asnycTask(1, defer);
    asnycTask(2, defer);
    asnycTask(3, defer);
}).then(function (defer, index, sec) {
    console.log('First return: ' + index, sec);
});
// TEST end
testThen(function (defer) {
    asnycTask(30, defer);
}, null, true).then(function (defer, a) {
    console.log(222, a);
    asnycTask(32, defer);
}).then(function (defer, a) {
    console.log(333, a);
    asnycTask(34, function (err, b) {
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