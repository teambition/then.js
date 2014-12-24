'use strict';
/*global */

var async = require('async');

module.exports = function (len, syncMode) {
  var task, list = [], tasks = [];

  if (syncMode) { // 模拟同步任务
    task = function (x, callback) {
      callback(null, x);
    };
  } else { // 模拟异步任务
    task = function (x, callback) {
      setImmediate(function () {
        callback(null, x);
      });
    };
  }

  function toThunk(fn, x) {
    return function (done) {
      fn(x, done);
    };
  }

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i;
    tasks[i] = task;
  }

  return function (callback) {
    // async 测试主体
    async.each(list, function (i, next) { // 并行 list 队列
      task(i, next);
    }, function (err) {
      if (err) return callback(err);
      async.eachSeries(list, function (i, next) { // 串行 list 队列
        task(i, next);
      }, function (err) {
        if (err) return callback(err);
        async.parallel(tasks.map(toThunk), function (err) { // 并行 tasks 队列
          if (err) return callback(err);
          async.series(tasks.map(toThunk), callback); // 串行 tasks 队列
        });
      });
    });
  };
};
