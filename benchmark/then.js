'use strict'
/* global */

var Thenjs = require('../then')

module.exports = function (len, syncMode) {
  var task
  var list = []
  var tasks = []

  if (syncMode) { // 模拟同步任务
    task = function (x, callback) {
      callback(null, x)
    }
  } else { // 模拟异步任务
    task = function (x, callback) {
      setImmediate(function () {
        callback(null, x)
      })
    }
  }

  function toThunk (fn, x) {
    return function (done) {
      fn(x, done)
    }
  }

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i
    tasks[i] = task
  }

  return function (callback) {
    // Thenjs 测试主体
    Thenjs.each(list, function (cont, i) { // 并行 list 队列
      task(i, cont)
    })
      .eachSeries(list, function (cont, i) { // 串行 list 队列
        task(i, cont)
      })
      .parallel(tasks.map(toThunk)) // 并行 tasks 队列
      .series(tasks.map(toThunk)) // 串行 tasks 队列
      .fin(function (cont, error) {
        callback(error)
      })
  }
}
