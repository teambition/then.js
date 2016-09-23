'use strict'
/* global Promise */

var thunk = require('thunks')()

module.exports = function (len, syncMode) {
  var task
  var list = []
  var tasks = []

  if (syncMode) { // 模拟同步任务
    task = function (x) {
      return function (callback) {
        callback(null, x)
      }
    }
  } else { // 模拟异步任务
    task = function (x) {
      return function (callback) {
        setImmediate(function () {
          callback(null, x)
        })
      }
    }
  }

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i
    tasks[i] = task
  }

  return function (callback) {
    // Thunk 测试主体
    thunk.all(list.map(function (i) { // 并行 list 队列
      return task(i)
    }))(function () { // 串行 tasks 队列
      return thunk.seq(list.map(function (i) {
        return task(i)
      }))
    })(function () {
      return thunk.all(tasks.map(function (sunTask, i) { // 并行 tasks 队列
        return sunTask(i)
      }))
    })(function () { // 串行 tasks 队列
      return thunk.seq(tasks.map(function (sunTask, i) { // 并行 tasks 队列
        return sunTask(i)
      }))
    })(callback)
  }
}
