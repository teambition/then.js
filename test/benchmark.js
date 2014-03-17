'use strict';
/*global console*/

var async = require('async'),
  Benchmark = require('benchmark'),
  thenjs = require('../then.js'),
  suite = new Benchmark.Suite();

var list = [], tasks = [];

function task(callback) {
  callback(null, 1);
  // 模拟异步任务
  // setTimeout(function () {
  //   callback(null, 1);
  // }, 4);
}

for (var i = 0; i < 100; i++) {
  list[i] = i;
  tasks[i] = task;
}

function eachAsync(deferred) {
  async.each(list, function (i, next) {
    task(next);
  }, function () {
    async.eachSeries(list, function (i, next) {
      task(next);
    }, function () {
      async.series(tasks, function () {
        async.parallel(tasks, function (error, result) {
          deferred.resolve();
        });
      });
    });
  });
}

function eachThen(deferred) {
  thenjs.each(list, function (defer, i) {
    task(defer);
  })
  .eachSeries(list, function (defer, i) {
    task(defer);
  })
  .series(tasks)
  .parallel(tasks)
  .all(function (defer, error, result) {
    deferred.resolve();
  });
}

suite.add('Thenjs', function (deferred) {
  eachThen(deferred);
}, {
  defer: true
}).add('Async', function (deferred) {
  eachAsync(deferred);
}, {
  defer: true
}).on('cycle', function (e) {
  console.log(String(e.target));
}).on('complete', function () {
  var fast = this.filter('fastest').pluck('name');
  console.log("Fastest is " + fast);
}).run({async: true});
