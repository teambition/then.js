'use strict'
/*global console*/

var When = require('when')

module.exports = function (len, syncMode) {
  var task
  var list = []
  var tasks = []

  if (syncMode) { // 模拟同步任务
    task = function (x) {
      return new When.Promise(function (resolve, reject) {
        resolve(x)
      })
    }
  } else { // 模拟异步任务
    task = function (x) {
      return new When.Promise(function (resolve, reject) {
        setImmediate(function () {
          resolve(x)
        })
      })
    }
  }

  // 构造任务队列
  for (var i = 0; i < len; i++) {
    list[i] = i
    tasks[i] = task
  }

  return function (callback) {
    // When 测试主体
    When.map(list, function (i) { // 并行 list 队列
      return task(i)
    })
      .then(function () { // 串行 list 队列
        return When.reduce(list, function (x, i) {
          return task(i)
        }, 1)
      })
      .then(function () { // 并行 tasks 队列
        return When.all(tasks.map(function (subTask, i) {
          return subTask(i)
        }))
      })
      .then(function () {  // 串行 tasks 队列
        return tasks.reduce(function (promise, subTask, i) {
          return promise.then(function () {
            return subTask(i)
          })
        }, When.resolve(1))
      })
      .then(function () {
        return callback()
      })
  }
}
