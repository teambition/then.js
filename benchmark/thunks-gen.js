'use strict';
/*global console*/

var Thunk = require('thunks')();

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

  task = Thunk.thunkify(task);

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i;
    tasks[i] = task;
  }

  return function (callback) {
    // Thunk generator 测试主体
    Thunk(function *(){
      // 并行 list 队列
      yield list.map(function (i) {
        return task(i);
      });
      // 串行 list 队列
      for (var i = 0, l = list.length; i < l; i++) {
        yield task(i);
      }
      // 并行 tasks 队列
      yield tasks.map(function (task, i) {
        return task(i);
      });
      // 串行 tasks 队列
      for (i = 0, l = tasks.length; i < l; i++) {
        yield tasks[i](i);
      }
    })(callback);
  };
};
