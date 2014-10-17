'use strict';
/*global console*/

var when = require('when');

module.exports = function (len, syncMode) {
  var task, list = [], tasks = [];

  if (syncMode) { // 模拟同步任务
    task = function () {
      return when.resolve(1);
    };
  } else { // 模拟异步任务
    task = function () {
      return when.promise(function (resolve) {
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
    // when 测试主体
    when.map(list, function (i) { // 并行 list 队列
      return task();
    })
    .then(function () { // 串行 list 队列
      return when.reduce(list, function (x, i) {
        return task(i);
      }, 1);
    })
    .then(function () { // 并行 tasks 队列
      return when.all(tasks.map(function (subTask) {
        return subTask();
      }));
    })
    .then(function () {  // 串行 tasks 队列
      return tasks.reduce(function (promise, subTask) {
        return promise.then(function () {
          return subTask();
        });
      }, when.resolve(1));
    })
    .then(function () {
      return callback();
    });
  };
};
