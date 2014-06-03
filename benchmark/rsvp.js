'use strict';
/*global console*/

var RSVP = require('rsvp');

module.exports = function (len, syncMode) {
  var task, list = [], tasks = [];

  if (syncMode) { // 模拟同步任务
    task = function () {
      return RSVP.resolve(1);
    };
  } else { // 模拟异步任务
    task = function () {
      return new RSVP.Promise(function (resolve) {
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
    // RSVP 测试主体
    RSVP.
      all(list.map(function (i) { // 并行 list 队列
        return task();
      })).
      then(function () { // 串行 list 队列
        return list.reduce(function (promise, i) {
          return promise.then(function () {
            return task();
          });
        }, RSVP.resolve());
      }).
      then(function () { // 并行 tasks 队列
        return RSVP.all(tasks);
      }).
      then(function () { // 串行 tasks 队列
        return tasks.reduce(function (promise, subTask) {
          return promise.then(function () {
            return subTask();
          });
        }, RSVP.resolve(1));
      }).
      then(function () {
        callback();
      });
  };
};