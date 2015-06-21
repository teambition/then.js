'use strict'
/*global console, Promise*/

var JSBench = require('jsbench')
var len = 1000 // 任务队列长度
var cycles = 1000 // 每个测试体运行次数
var syncMode = false // 用同步任务测试

var jsbench = new JSBench()

console.log((syncMode ? 'Sync' : 'Async') + ' Benchmark...')

// 如果支持 Promise，则加入 Promise 测试
if (typeof Promise === 'function') {
  jsbench.add('Promise', require('./promise.js')(len, syncMode))
} else {
  console.log('Not support Promise!')
}

try { // 检测是否支持 generator
  var check = new Function('return function*(){}') // eslint-disable-line
  jsbench.add('co', require('./co.js')(len, syncMode))
  jsbench.add('thunks-generator', require('./thunks-gen.js')(len, syncMode))
} catch (e) {
  console.log('Not support generator!')
}

jsbench
  .add('bluebird', require('./bluebird.js')(len, syncMode))
  .add('when', require('./when.js')(len, syncMode))
  .add('RSVP', require('./rsvp.js')(len, syncMode))
  .add('async', require('./async.js')(len, syncMode))
  .add('thenjs', require('./then.js')(len, syncMode))
  .add('thunks', require('./thunks.js')(len, syncMode))
  // on('cycle', function(e) {console.log(e.name, e.cycle, e.time + 'ms')}).
  .run(cycles)
