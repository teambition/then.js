'use strict';
/*global console*/

var async = require('async'),
  thenjs = require('../then.js'),
  Benchmark = require('jsbench');

var list = [], tasks = [];

function task(callback) {
  // 模拟同步任务
  // callback(null, 1);
  // 模拟异步任务
  thenjs.nextTick(function () {
    callback(null, 1);
  });
}

// 构造任务流
for (var i = 0; i < 1000; i++) {
  list[i] = i;
  tasks[i] = task;
}

var bench = new Benchmark();

bench.add('async', function (callback) {
  // async 测试主体
  async.each(list, function (i, next) {
    task(next);
  }, function (err) {
    if (err) return callback(err);
    async.eachSeries(list, function (i, next) {
      task(next);
    }, function (err) {
      if (err) return callback(err);
      async.series(tasks, function (err) {
        if (err) return callback(err);
        async.parallel(tasks, callback);
      });
    });
  });
}).add('thenjs', function (callback) {
  // thenjs 测试主体
  thenjs.each(list, function (cont, i) {
    task(cont);
  })
  .eachSeries(list, function (cont, i) {
    task(cont);
  })
  .series(tasks)
  .parallel(tasks)
  .then(function (cont, result) {
    callback(null, result);
  }).fail(function (cont, error) {
    callback(error);
  });
}).run(100); // 循环测试 100 次