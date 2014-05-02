'use strict';
/*global module, process*/

var thenjs = require('../then.js'),
  slice = [].slice;

function getArray(length) {
  // 生成有序数组
  var a = [];
  while (length > 0) {
    a.push(a.length);
    length--;
  }
  return a;
}

function asnycTask() {
  // 虚拟异步回调任务，最后一个参数为callback，异步返回callback之前的所有参数
  var args = arguments,
    callback = args[args.length - 1];
  thenjs.nextTick(function () {
    callback.apply(null, slice.call(args, 0, -1));
  });
}

function testThen(test, then, num) {
  // // then.js测试主体
  // then(function (cont) {
  // //只响应返回结果最快的一个函数
  //   asnycTask(1, cont);
  //   asnycTask(2, cont);
  //   asnycTask(3, cont);
  // }).then(function (cont, index, sec) {
  //   console.log('First return: ' + index, sec);
  //   test.ok(true, "Coffee thenjs assertion should pass!");
  //   test.done();
  // });
  return then.parallel([
    function (cont) {
      asnycTask(null, num, cont);
    },
    function (cont) {
      asnycTask(null, num + 1, cont);
    },
    function (cont) {
      asnycTask(null, num + 2, cont);
    }
  ]).then(function (cont, result) {
    test.deepEqual(result, [num, num + 1, num + 2], 'Test parallel');
    asnycTask(null, cont);
  }).series([
    function (cont) {
      asnycTask(null, num + 3, cont);
    },
    function (cont) {
      asnycTask(null, num + 4, cont);
    }
  ]).then(function (cont, result) {
    test.deepEqual(result, [num + 3, num + 4], 'Test series');
    asnycTask(num, cont);
  }).then(function () {}, function (cont, err) {
    test.strictEqual(err, num, 'Test errorHandler');
    asnycTask(num, num, cont);
  }).all(function (cont, err, result) {
    test.strictEqual(err, num, 'Test all');
    test.equal(result, num);
    cont(null, [num, num + 1, num + 2]);
  }).each(null, function (cont, value, index) {
    test.equal(value, num + index);
    asnycTask(null, value, cont);
  }).then(function (cont, result) {
    test.deepEqual(result, [num, num + 1, num + 2], 'Test each');
    asnycTask(null, [num, num + 1, num + 2], function (cont, value, index) {
      test.equal(value, num + index);
      asnycTask(null, value, cont);
    }, cont);
  }).eachSeries(null, null).then(function (cont, result) {
    test.deepEqual(result, [num, num + 1, num + 2], 'Test eachSeries');
    throw num;
  }).then(function () {
    test.ok(false, 'This should not run!');
  }).fail(function (cont, err, a) {
    test.strictEqual(err, num, 'Test fail');
    asnycTask(null, num, cont);
  });
}

thenjs.onerror = function (error) {console.error(error.stack);};

exports.testThen = function (test) {
  var list = getArray(100);
  var test1 = thenjs.each(list, function (cont, value) {
    testThen(test, thenjs, value).all(function (cont2, error, result) {
      cont(error, result);
    });
  });
  var test2 = test1.eachSeries(null, function (cont, value) {
    testThen(test, thenjs, value).all(cont);
  });
  var test3 = test2.then(function (cont, result) {
    test.deepEqual(result, list, 'Test each and eachSeries');
    cont(list);
  });
  thenjs.nextTick(function () {
    test3.fail(function (cont, err) {
      test.strictEqual(err, list, 'None error');
      test.done();
    });
  });
};
