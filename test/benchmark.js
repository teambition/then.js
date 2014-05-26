'use strict';
/*global console, Promise*/

var async = require('async'),
  thenjs = require('../then.js'),
  JSBench = require('jsbench');

var list = [], tasks = [];

function task(callback) {
  // 模拟同步任务
  callback(null, 1);
  // 模拟异步任务
  // thenjs.nextTick(function () {
  //   callback(null, 1);
  // });
}

// 构造任务流
for (var i = 0; i < 1000; i++) {
  list[i] = i;
  tasks[i] = task;
}

var jsbench = new JSBench();

if (typeof Promise === 'function') {
  jsbench.add('Promise', function (callback) {
    // 原生 Promise 测试主体
    Promise.all(list.map(function (i) { // 并行 list 队列
      return new Promise(function (resolve) {
        task(function (error, value) {
          resolve(value);
        });
      });
    })).then(function () {
      return list.reduce(function (promise, i) { // 串行 list 队列
        return promise.then(function () {
          return new Promise(function (resolve) {
            task(function (error, value) {
              resolve(value);
            });
          });
        });
      }, Promise.resolve());
    }).then(function () {
      return Promise.all(tasks.map(function (subTask) { // 并行 tasks 队列
        return new Promise(function (resolve) {
          subTask(function (error, value) {
            resolve(value);
          });
        });
      }));
    }).then(function () {
      return tasks.reduce(function (promise, subTask) { // 串行 tasks 队列
        return promise.then(function () {
          return new Promise(function (resolve) {
            subTask(function (error, value) {
              resolve(value);
            });
          });
        });
      }, Promise.resolve());
    }).then(function () {
      callback();
    });
  });
}

jsbench.add('async', function (callback) {
  // async 测试主体
  async.each(list, function (i, next) { // 并行 list 队列
    task(next);
  }, function (err) {
    if (err) return callback(err);
    async.eachSeries(list, function (i, next) { // 串行 list 队列
      task(next);
    }, function (err) {
      if (err) return callback(err);
      async.parallel(tasks, function (err) { // 并行 tasks 队列
        if (err) return callback(err);
        async.series(tasks, callback); // 串行 tasks 队列
      });
    });
  });
}).add('thenjs', function (callback) {
  // thenjs 测试主体
  thenjs.each(list, function (cont, i) { // 并行 list 队列
    task(cont);
  })
  .eachSeries(list, function (cont, i) { // 串行 list 队列
    task(cont);
  })
  .parallel(tasks) // 并行 tasks 队列
  .series(tasks) // 串行 tasks 队列
  .all(function (cont, error) {
    callback(error);
  });
}).run(100); // 循环测试 100 次