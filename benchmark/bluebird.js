'use strict';
/*global console*/

var Bluebird = require('bluebird');

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

  function promiseify(fn) {
    return function (x) {
      return new Bluebird(function (resolve, reject) {
        fn(i, function (error, value) {
          if (error) return reject(error);
          resolve(value);
        });
      });
    };
  }

  task = promiseify(task);

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i;
    tasks[i] = task;
  }

  return function (callback) {
    // bluebird 测试主体
    Bluebird
      .map(list, function (i) { // 并行 list 队列
        return task(i);
      })
      .then(function () { // 串行 list 队列
        return Bluebird.reduce(list, function (x, i) {
          return task(i);
        }, 1);
      })
      .then(function () { // 并行 tasks 队列
        return Bluebird.all(tasks.map(function (task, i) {
          return task(i);
        }));
      })
      .then(function () {  // 串行 tasks 队列
        return tasks.reduce(function (promise, subTask, i) {
          return promise.then(function () {
            return subTask(i);
          });
        }, Bluebird.resolve());
      })
      .then(function () {
        return callback();
      });
  };
};
