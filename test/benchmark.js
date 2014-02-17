'use strict';
/*global console*/

var async = require('async'),
  Benchmark = require('benchmark'),
  thenjs = require('../then.js'),
  suite = new Benchmark.Suite();

var list = [];
for (var i = 0; i < 100; i++) {
  list[i] = i;
}

function eachAsync() {
  async.each(list, function (i, next) {
    next(null, i);
  });
}

function eachThen() {
  thenjs.each(list, function (defer, i) {
    defer(null, i);
  });
}

suite.add('Async#each', function () {
  eachAsync();
}).add('Thenjs#each', function () {
  eachThen();
}).on('cycle', function (e) {
  console.log(String(e.target));
}).on('complete', function () {
  var fast = this.filter('fastest').pluck('name');
  console.log("Fastest is " + fast);
}).run({async: true});
