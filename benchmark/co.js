'use strict';
/*global console*/

var co = require('co');

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
    // co 测试主体
    co(function *(){
      // 并行 list 队列
      yield list.map(function (i) {
        return task;
      });
      // 串行 list 队列
      for (var i = 0, l = list.length; i < l; i++) {
        yield task;
      }
      // 并行 tasks 队列
      yield tasks;
      // 串行 tasks 队列
      for (i = 0, l = tasks.length; i < l; i++) {
        yield tasks[i];
      }
    })(callback);
  };
};