'use strict';
/*global Promise */

var Thunk = require('thunks')();

module.exports = function (len, syncMode) {
  var task, list = [], tasks = [];

  if (syncMode) { // 模拟同步任务
    task = function (callback) {
      callback(null, 1);
    };
  } else { // 模拟异步任务
    task = function (callback) {
      setImmediate(function () {
        callback(null, 1);
      });
    };
  }

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i;
    tasks[i] = task;
  }

  return function (callback) {
    // Thunk 测试主体
    Thunk.
      all(list.map(function (i) { // 并行 list 队列
        return Thunk(function (callback) {
          task(callback);
        });
      }))(function () { // 串行 tasks 队列
        return list.reduce(function (thunk, i) {
          return thunk(function () {
            return Thunk(function (callback) {
              task(callback);
            });
          });
        }, Thunk(null));
      })(function () {
        return Thunk.all(tasks.map(function (sunTask) { // 并行 tasks 队列
          return Thunk(function (callback) {
            sunTask(callback);
          });
        }));
      })(function () { // 串行 tasks 队列
        return tasks.reduce(function (thunk, sunTask) {
          return thunk(function () {
            return Thunk(function (callback) {
              sunTask(callback);
            });
          });
        }, Thunk(null));
      })(function (error, value) {
        callback(error, value);
      });
  };
};
