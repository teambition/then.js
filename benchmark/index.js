'use strict';
/*global console, Promise*/

var JSBench = require('jsbench'),
  len = 1000, // 任务队列长度
  cycles = 100, // 每个测试体运行次数
  syncMode = true; // 用同步任务测试




var jsbench = new JSBench();

// 如果支持 Promise，则加入 Promise 测试
if (typeof Promise === 'function') {
  jsbench.add('Promise', require('./promise.js')(len, syncMode));
}

// try { // 检测是否支持 generator，是则加载 co 测试
//   new Function('return function* () {}');
//   jsbench.add('co', require('../test-es6/co.js')())
// } catch (e) {}

jsbench.
  add('bluebird', require('./bluebird.js')(len, syncMode)).
  add('async', require('./async.js')(len, syncMode)).
  add('thenjs', require('./then.js')(len, syncMode)).
  run(cycles);
