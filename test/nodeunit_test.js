'use strict';
/*global module, process*/
//TODO write test with nodeunit

// TEST begin
var then = require('../then.min.js'),
    coffee_then = require('../coffee/then.js');

function asnycTask(index, callback) {
    var s = Math.random() * 1000 * index;
    setTimeout(function () {
        console.log(index);
        callback(null, index, s);
    }, s);
}

exports.testThenjs = function (test) {
    then(function (defer) {
        asnycTask(10, defer);
    }, null, true).then(function (defer, a) {
        console.log(222, a);
        asnycTask(15, defer);
    }).then(function (defer, a) {
        console.log(333, a);
        asnycTask(20, function (err, b) {
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
        test.ok(true, "Thenjs assertion should pass!");
        test.done();
    });
};
exports.testCoffeeThenjs = function (test) {
    coffee_then(function (defer) {
    //只响应返回结果最快的一个函数
        asnycTask(1, defer);
        asnycTask(2, defer);
        asnycTask(3, defer);
    }).then(function (defer, index, sec) {
        console.log('First return: ' + index, sec);
        test.ok(true, "Coffee thenjs assertion should pass!");
        test.done();
    });
};
// TEST end
