'use strict'
/*global console, Promise*/

var JSBench = require('jsbench')
var len = 1000 // 任务队列长度
var cycles = 1000 // 每个测试体运行次数
var syncMode = true // 用同步任务测试

var jsbench = new JSBench()

console.log((syncMode ? 'Sync' : 'Async') + ' Benchmark...')

jsbench
  .add('Promise', require('./promise.js')(len, syncMode))
  .add('bluebird', require('./bluebird.js')(len, syncMode))
  .add('co', require('./co.js')(len, syncMode))
  .add('thunks', require('./thunks.js')(len, syncMode))
  .add('thunks-generator', require('./thunks-gen.js')(len, syncMode))
  .add('async', require('./async.js')(len, syncMode))
  .add('thenjs', require('./then.js')(len, syncMode))
  // on('cycle', function(e) {console.log(e.name, e.cycle, e.time + 'ms')}).
  .run(cycles)
