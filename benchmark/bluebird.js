'use strict';
/*global console*/

var Bluebird = require('bluebird');

module.exports = function (len, syncMode) {
  var task, list = [], tasks = [];

  if (syncMode) { // 模拟同步任务
    task = function () {
      return Bluebird.resolve(1);
    };
  } else { // 模拟异步任务
    task = function () {
      return new Bluebird(function (resolve) {
        setImmediate(function () {
          resolve(1);
        });
      });
    };
  }

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i;
    tasks[i] = task;
  }

  return function (callback) {
    // bluebird 测试主体
    Bluebird.map(list, function (i) { // 并行 list 队列
      return task();
    }).then(function () { // 串行 list 队列
      return Bluebird.reduce(list, function (x, i) {
        return task();
      }, 1);
    }).then(function () { // 并行 tasks 队列
      return Bluebird.all(tasks.map(function (subTask) {
        return subTask();
      }));
    }).then(function () {  // 串行 tasks 队列
      return tasks.reduce(function (promise, subTask) {
        return promise.then(function () {
          return subTask();
        });
      }, Bluebird.resolve());
    }).then(function () {
      return callback();
    });
  };
};