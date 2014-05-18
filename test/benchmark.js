'use strict';
/*global console*/

var async = require('async'),
  thenjs = require('../then.js');

var loops = [], list = [], tasks = [];

function task(callback) {
  // 模拟同步任务
  callback(null, 1);
  // 模拟异步任务
  // thenjs.nextTick(function () {
  //   callback(null, 1);
  // });
}

for (var i = 0; i < 10000; i++) {
  list[i] = i;
  tasks[i] = task;
}
for (var i = 0; i < 100; i++) {
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
  thenjs.each(list, function (cont, i) {
    task(cont);
  })
  .eachSeries(list, function (cont, i) {
    task(cont);
  })
  .series(tasks)
  .parallel(tasks)
  .then(function (cont, result) {
    callback(null, result);
  }).fail(function (cont, error) {
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

thenjs(function(cont) {
  console.log('async begin:');
  asyncTime = Date.now();
  cont();
})
.eachSeries(loops, function (cont, i) {
  // console.log(i);
  thenjs.defer(cont, eachAsync, cont);
})
.all(function (cont, error, result) {
  if (error) {
    console.error('async error: ', error);
    asyncTime = 0;
  } else {
    asyncTime = Date.now() - asyncTime;
  }
  console.log('thenjs begin:');
  thenjsTime = Date.now();
  cont();
})
.eachSeries(loops, function (cont, i) {
  // console.log(i);
  thenjs.defer(cont, eachThen, cont);
})
.all(function (cont, error, result) {
  if (error) {
    console.error('thenjs error: ', error);
    thenjsTime = 0;
  } else {
    thenjsTime = Date.now() - thenjsTime;
  }
  genResult('async', asyncTime);
  genResult('thenjs', thenjsTime);
});
