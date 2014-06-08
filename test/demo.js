    'use strict';
    /*global console*/

    var thenjs = require('../then.js');

    function task(arg, callback) { // 模拟异步任务
      thenjs.nextTick(function () {
        callback(null, arg);
      });
    }

    function errorTask(error, callback) { // 模拟出错的异步任务
      thenjs.nextTick(function () {
        callback(error);
      });
    }

    thenjs(function (cont) {
      task(10, cont); // 执行第一个异步任务
    }).
    then(function (cont, arg) {
      console.log(arg); // 输出 10
      errorTask(new Error('error!!'), cont); // 执行第二个报错的异步任务
    }).
    fail(function (cont, error) {
      console.log(error); // 输出 Error: error!!
      cont(); // 继续下一个链接
    }).
    each([0, 1, 2], function (cont, value) {
      task(value * 2, cont); // 并行执行队列任务，把队列 list 中的每一个值输入到 task 中运行
    }).
    then(function (cont, result) {
      console.log(result); // 输出 [0, 2, 4]
      cont(); // 继续下一个链
    }).
    series([ // 串行执行队列任务
      function (cont) { task(88, cont); }, // 队列第一个是异步任务
      function (cont) { cont(null, 99); } // 第二个是同步任务
    ]).
    fin(function (cont, error, result) {
      console.log(error, result); // 输出 null [88, 99]
    });
