'use strict';
/*global console*/

var async = require('async'),
  thenjs = require('../then.js');

var loops = [], list = [], tasks = [];

function task(callback) {
  // 模拟同步任务
  // callback(null, 1);
  // 模拟异步任务
  thenjs.nextTick(function () {
    callback(null, 1);
  });
}

for (var i = 0; i < 1000; i++) {
  list[i] = i;
  tasks[i] = task;
}
for (var i = 0; i < 1000; i++) {
  loops[i] = i;
}

function eachAsync(callback) {
  async.each(list, function (i, next) {
    task(next);
  }, function (err) {
    if (err) return callback(err);
    async.eachSeries(list, function (i, next) {
      task(next);
    }, function (err) {
      if (err) return callback(err);
      async.series(tasks, function (err) {
        if (err) return callback(err);
        async.parallel(tasks, callback);
      });
    });
  });
}

function eachThen(callback) {
  thenjs.each(list, function (defer, i) {
    task(defer);
  })
  .eachSeries(list, function (defer, i) {
    task(defer);
  })
  .series(tasks)
  .parallel(tasks)
  .then(function (defer, result) {
    callback(null, result);
  }).fail(function (defer, error) {
    callback(error);
  });
}

var asyncTime = 0, thenjsTime = 0;

function genResult(name, time) {
  if (!time) return;
  var length = loops.length,
    ms = time / length,
    ops = 1000 / ms;
  console.log(name + ' : ' + length + ' loops, ' + ms + ' ms/loop, ' + ops.toFixed(2) + ' ops/sec.');
}

thenjs(function(defer) {
  console.log('async begin:');
  asyncTime = Date.now();
  defer();
})
.eachSeries(loops, function (defer, i) {
  console.log(i);
  eachAsync(defer);
})
.all(function (defer, error, result) {
  if (error) {
    console.error('async error: ', error);
    asyncTime = 0;
  } else {
    asyncTime = Date.now() - asyncTime;
  }
  console.log('thenjs begin:');
  thenjsTime = Date.now();
  defer();
})
.eachSeries(loops, function (defer, i) {
  console.log(i);
  eachThen(defer);
})
.all(function (defer, error, result) {
  if (error) {
    console.error('thenjs error: ', error);
    thenjsTime = 0;
  } else {
    thenjsTime = Date.now() - thenjsTime;
  }
  genResult('async', asyncTime);
  genResult('thenjs', thenjsTime);
});