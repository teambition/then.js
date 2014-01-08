'use strict';
/*global module, then, process*/
// TODO

function getArray(length) {
  // 生成有序数组
  var a = [];
  while (length > 0) {
    a.push((a.length + 1) * 7);
    length--;
  }
  return a;
}

function asnycTask() {
  // 虚拟异步回调任务，最后一个参数为callback，异步返回callback之前的所有参数
  var callback = arguments[arguments.length - 1],
    result = [].slice.call(arguments, 0, -1);
  setTimeout(function () {
    callback.apply(callback.nextThenObject, result);
  }, Math.random() * 20);
}
function test() {
  var list = getArray(2);
  then.series([function (defer) {
    then(function(defer2) {
      asnycTask(null, 2 * 3, defer2);
    }).all(defer);
  }, function (defer) {
    then(function(defer2) {
      asnycTask(null, 3 * 3, defer2);
    }).all(defer);
  }]).then(function (defer, err, result) {
    console.log(err, result);
  });
}
