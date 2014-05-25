then.js 1.0.0 [![Build Status](https://travis-ci.org/zensh/then.js.png?branch=master)](https://travis-ci.org/zensh/then.js)
====
小巧、简单、强大的链式异步编程工具！

**能用简单优美的方式将任何同步或异步回调函数转换成then()链式调用！**

**你可以在服务器端（node.js）或浏览器中使用then.js，兼容ie6/7/8。**

## 特征

1. 可以像标准的 `Promise` 那样，把N多异步回调函数写成一个长长的 `then` 链，并且比 Promise 更简洁自然。因为如果使用标准 Promise 的 then 链，其中的异步函数都必须转换成 Promise，thenjs 则无需转换，像使用 callback 一样执行异步函数即可。

2. 可以像 `async`那样实现同步或异步队列函数，并且比 async 更方便。因为 async 的队列是一个个独立体，而 thenjs 的队列在 `Then` 链上，可形成链式调用。

3. 强大的 Error 机制，可以捕捉任何同步或异步的异常错误，甚至是位于异步函数中的语法错误。并且捕捉的错误任君处置。

4. 开启debug模式，可以把每一个then链运行结果输出到debug函数（未定义debug函数则用 console.log），方便调试。

##Benchmark

`node test/benchmark.js`，centos 虚拟机中测试结果：

**同步任务，thenjs 比 async 快 100% 以上 !**，并且 async不支持过长（如超过3000）的同步任务（将会出现`Maximum call stack size exceeded`）

**异步任务，thenjs 比 async 快 20% 以上!**

## DEMO

    'use strict';
    /*global console*/

    var thenjs = require('../then.js');

    function task(arg, callback) { // 模拟异步任务
      thenjs.nextTick(function () {
        callback(null, arg);
      });
    }

    function errorTask(error, callback) { // 模拟出错的异步任务
      thenjs.nextTick(function () {
        callback(error);
      });
    }

    thenjs(function (cont) {
      task(10, cont); // 执行第一个异步任务
    }).then(function (cont, arg) {
      console.log(arg); // 输出 10
      errorTask(new Error('error!!'), cont); // 执行第二个报错的异步任务
    }).fail(function (cont, error) {
      console.log(error); // 输出 Error: error!!
      cont(); // 继续下一个链接
    }).each([0, 1, 2], function (cont, value) {
      task(value * 2, cont); // 并行执行队列任务，把队列 list 中的每一个值输入到 task 中运行
    }).then(function (cont, result) {
      console.log(result); // 输出 [0, 2, 4]
      cont(); // 继续下一个链
    }).series([ // 串行执行队列任务
      function (cont) { task(88, cont); }, // 队列第一个是异步任务
      function (cont) { cont(null, 99); } // 第二个是同步任务
    ]).all(function (cont, error, result) {
      console.log(error, result); // 输出 null [88, 99]
    });

## Install

**Node.js:**

    npm install thenjs

**bower:**

    bower install thenjs

**Browser:**

    <script src="/pathTo/then.js"></script>

**with AMD**

    define(['thenjs'], function (thenjs) {
        //...
    });


## API

**以下所有的 'cont'，取义于 `continue`。'cont' 绑定到了下一个 `Then` 链，即收集当前任务结果，继续执行下一链。它等效于 node.js 的 `callback`，可以接受多个参数，其中第一个参数为 'error'。**

### thenjs(startFn, [debug])

执行 `startFn`，返回一个新的 `Then` 对象.

+ **startFn:** Function，function (cont) {}
+ **debug:** Boolean 或 Function，可选，开启调试模式，将每一个链的运行结果用 `debug` 函数处理，如果debug为非函数真值，则调用 `console.log`，下同

### thenjs.each(array, iterator, [debug])

将 `array` 中的值应用于 `iterator` 函数（同步或异步），并行执行。返回一个新的 `Then` 对象。

+ **array:** Array
+ **iterator:** Function，function (cont, value, index, array) {}

### thenjs.eachSeries(array, iterator, [debug])

将 `array` 中的值应用于 `iterator` 函数（同步或异步），串行执行。返回一个新的 `Then` 对象。

+ **array:** Array,
+ **iterator:** Function，function (cont, value, index, array) {}


### thenjs.parallel(taskFnArray, [debug])

`taskFnArray` 是一个函数（同步或异步）数组，并行执行。返回一个新的 `Then` 对象。

+ **taskFnArray:** Array，[taskFn1, taskFn2, taskFn3, ...]，其中，taskFn 形式为 function (cont) {}


### thenjs.series(taskFnArray, [debug])

`taskFnArray` 是一个函数（同步或异步）数组，串行执行。返回一个新的 `Then` 对象。

+ **taskFnArray:** Array，[taskFn1, taskFn2, taskFn3, ...]，其中，taskFn 形式为 function (cont) {}

### Then.prototype.then(successHandler, [errorHandler])

如果上一链正确，则进入 `successHandler` 执行，否则进入 `errorHandler` 执行。返回一个新的 `Then` 对象。

+ **successHandler:** Function，function (cont, value1, value2, ...) {}
+ **errorHandler:** Function，可选，function (cont, error) {}

### Then.prototype.all(allHandler)

无论上一链是否存在 `error`，均进入 `allHandler` 执行，等效于 `.then(successHandler, errorHandler)`。返回一个新的 `Then` 对象。

+ **allHandler:** Function，function (cont, error, value1, value2, ...) {}

### Then.prototype.fail(errorHandler)

`fail` 用于捕捉 `error`，如果在它之前的任意一个链上产生了 `error`，并且未被 `then`, `all` 等捕获，则会跳过中间链，直接进入 `fail`。返回一个新的 `Then` 对象。

+ **errorHandler:** Function，function (cont, error) {}

### Then.prototype.each(array, iterator)

参数类似 `thenjs.each`，返回一个新的 `Then` 对象。

不同在于，参数可省略，如果没有参数，则会查找上一个链的输出结果作为参数，即上一个链可以这样 `cont(null, array, iterator)` 传输参数到each。下面三个队列方法行为类似。

### Then.prototype.eachSeries(array, iterator)

参数类似 `thenjs.eachSeries`，返回一个新的 `Then` 对象。

### Then.prototype.parallel(taskFnArray)

参数类似 `thenjs.parallel`，返回一个新的 `Then` 对象。

### Then.prototype.series(taskFnArray)

参数类似 `thenjs.series`，返回一个新的 `Then` 对象。

### thenjs.nextTick(callback, arg1, arg2, ...)

工具函数，类似于 `node.js` 的 `setImmediate`，异步执行 `callback`，而 `arg1`, `arg2` 会成为它的运行参数。

### thenjs.defer(errorHandler, callback, arg1, arg2, ...)

工具函数，类似于 `thenjs.nextTick`，不同的是异步使用 `try catch` 执行 `callback`，如果捕捉到 `error`，则进入 `errorHandler` 执行。

+ **errorHandler:** Function，function (error) {}

### thenjs.onerror = function (error) {};

全局配置参数，用户可自定义的全局 error 监听函数，`thenjs.onerror` 默认值为 `undefined`。若定义，当执行链上发生 `error` 且没有被捕捉时，`error` 会进入 `thenjs.onerror`。

### thenjs.maxTickDepth = 100;

全局配置参数， 默认值为 `100`。如果同步任务串行执行，嵌套深度达到一定值时，javascript 会报错 `Maximum call stack size exceeded`，`thenjs.maxTickDepth` 就是为了解决这个问题，当串行任务流执行深度达到 `maxTickDepth` 值时，强制异步执行一次。


### Who Used

 + AngularJS中文社区：<http://angularjs.cn/>
 + Teambition：<http://teambition.com/>


## Examples

更多使用案例请参考[jsGen](https://github.com/zensh/jsgen)源代码！
