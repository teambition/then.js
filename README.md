then.js 1.3.2 [![Build Status](https://travis-ci.org/teambition/then.js.png?branch=master)](https://travis-ci.org/teambition/then.js)
====
小巧、简单、强大的链式异步编程工具（4.11KB）！

**能用简单优美的方式将任何同步或异步回调函数转换成then()链式调用！**

**你可以在服务器端（node.js）或浏览器中使用then.js，兼容ie6/7/8。**

## 特征

1. 可以像标准的 `Promise` 那样，把N多异步回调函数写成一个长长的 `then` 链，并且比 Promise 更简洁自然。因为如果使用标准 Promise 的 then 链，其中的异步函数都必须转换成 Promise，Thenjs 则无需转换，像使用 callback 一样执行异步函数即可。

2. 可以像 `async`那样实现同步或异步队列函数，并且比 async 更方便。因为 async 的队列是一个个独立体，而 Thenjs 的队列在 `Thenjs` 链上，可形成链式调用。

3. 强大的 Error 机制，可以捕捉任何同步或异步的异常错误，甚至是位于异步函数中的语法错误。并且捕捉的错误任君处置。

4. 开启debug模式，可以把每一个then链运行结果输出到debug函数（未定义debug函数则用 console.log），方便调试。

##Benchmark

`node benchmark/index.js`，centos 虚拟机中测试结果：

    [root@centos then.js]# node benchmark/index
    Async Benchmark...

    JSBench Start (100 cycles, async mode):
    Test Promise...
    Test co...
    Test bluebird...
    Test when...
    Test RSVP...
    Test async...
    Test thenjs...
    Test Q...

    JSBench Results:
    Q: 100 cycles, 326.27 ms/cycle, 3.065 ops/sec
    Promise: 100 cycles, 83.26 ms/cycle, 12.011 ops/sec
    RSVP: 100 cycles, 29.67 ms/cycle, 33.704 ops/sec
    when: 100 cycles, 28.7 ms/cycle, 34.843 ops/sec
    bluebird: 100 cycles, 28.63 ms/cycle, 34.928 ops/sec
    async: 100 cycles, 18.76 ms/cycle, 53.305 ops/sec
    co: 100 cycles, 18.13 ms/cycle, 55.157 ops/sec
    thenjs: 100 cycles, 13.16 ms/cycle, 75.988 ops/sec

    Q: 100%; Promise: 391.87%; RSVP: 1099.66%; when: 1136.83%; bluebird: 1139.61%;
    async: 1739.18%; co: 1799.61%; thenjs: 2479.26%;

    JSBench Completed!


    [root@centos then.js]# node benchmark/index
    Sync Benchmark...

    JSBench Start (100 cycles, async mode):
    Test Promise...
    Test co...
    Test bluebird...
    Test when...
    Test RSVP...
    Test async...
    Test thenjs...
    Test Q...

    JSBench Results:
    Q: 100 cycles, 97.51 ms/cycle, 10.255 ops/sec
    Promise: 100 cycles, 56.63 ms/cycle, 17.658 ops/sec
    async: 100 cycles, 5.56 ms/cycle, 179.856 ops/sec
    when: 100 cycles, 4.59 ms/cycle, 217.865 ops/sec
    co: 100 cycles, 3.43 ms/cycle, 291.545 ops/sec
    RSVP: 100 cycles, 2.62 ms/cycle, 381.679 ops/sec
    bluebird: 100 cycles, 2.5 ms/cycle, 400.000 ops/sec
    thenjs: 100 cycles, 1.7 ms/cycle, 588.235 ops/sec

    Q: 100%; Promise: 172.19%; async: 1753.78%; when: 2124.40%; co: 2842.86%;
    RSVP: 3721.76%; bluebird: 3900.40%; thenjs: 5735.88%;

    JSBench Completed!


**`async` 和 `co` 不支持过长（如超过3000）的同步任务（将会出现`Maximum call stack size exceeded`）**

## Demo

    'use strict';
    /*global console*/

    var Thenjs = require('../then.js');

    function task(arg, callback) { // 模拟异步任务
      Thenjs.nextTick(function () {
        callback(null, arg);
      });
    }

    Thenjs(function (cont) {
      task(10, cont);
    }).
    then(function (cont, arg) {
      console.log(arg);
      cont(new Error('error!'), 123);
    }).
    fin(function (cont, error, result) {
      console.log(error, result);
      cont();
    }).
    each([0, 1, 2], function (cont, value) {
      task(value * 2, cont); // 并行执行队列任务，把队列 list 中的每一个值输入到 task 中运行
    }).
    then(function (cont, result) {
      console.log(result);
      cont();
    }).
    series([ // 串行执行队列任务
      function (cont) { task(88, cont); }, // 队列第一个是异步任务
      function (cont) { cont(null, 99); } // 第二个是同步任务
    ]).
    then(function (cont, result) {
      console.log(result);
      cont(new Error('error!!'));
    }).
    fail(function (cont, error) { // 通常应该在链的最后放置一个 `fail` 方法收集异常
      console.log(error);
      console.log('DEMO END!');
    });


## Install

**Node.js:**

    npm install thenjs

**bower:**

    bower install thenjs

**Browser:**

    <script src="/pathTo/then.js"></script>


## API

**以下所有的 'cont'，取义于 `continue`。'cont' 绑定到了下一个 `Thenjs` 链，即收集当前任务结果，继续执行下一链。它等效于 node.js 的 `callback`，可以接受多个参数，其中第一个参数为 'error'。**

### Thenjs(start, [debug])

主构造函数，返回一个新的 `Thenjs` 对象。

+ **start:** Function，function (cont) {}, 即 `thunk` 函数（见下面解释），或者 `Promise` 对象，或者 `Thenjs` 对象，或者其他值。
+ **debug:** Boolean 或 Function，可选，开启调试模式，将每一个链的运行结果用 `debug` 函数处理，如果debug为非函数真值，则调用 `console.log`，下同

### Thenjs.each(array, iterator, [debug])

将 `array` 中的值应用于 `iterator` 函数（同步或异步），并行执行。返回一个新的 `Thenjs` 对象。

+ **array:** Array
+ **iterator:** Function，function (cont, value, index, array) {}

### Thenjs.eachSeries(array, iterator, [debug])

将 `array` 中的值应用于 `iterator` 函数（同步或异步），串行执行。返回一个新的 `Thenjs` 对象。

+ **array:** Array,
+ **iterator:** Function，function (cont, value, index, array) {}


### Thenjs.parallel(taskFnArray, [debug])

`taskFnArray` 是一个函数（同步或异步）数组，并行执行。返回一个新的 `Thenjs` 对象。

+ **taskFnArray:** Array，[taskFn1, taskFn2, taskFn3, ...]，其中，taskFn 形式为 function (cont) {}


### Thenjs.series(taskFnArray, [debug])

`taskFnArray` 是一个函数（同步或异步）数组，串行执行。返回一个新的 `Thenjs` 对象。

+ **taskFnArray:** Array，[taskFn1, taskFn2, taskFn3, ...]，其中，taskFn 形式为 function (cont) {}

### Thenjs.prototype.then(successHandler, [errorHandler])

如果上一链正确，则进入 `successHandler` 执行，否则进入 `errorHandler` 执行。返回一个新的 `Thenjs` 对象。

+ **successHandler:** Function，function (cont, value1, value2, ...) {}
+ **errorHandler:** Function，可选，function (cont, error) {}

### Thenjs.prototype.finally(finallyHandler)

别名：Thenjs.prototype.fin(finallyHandler)

原名`all`建议不要使用，以后将停用。

无论上一链是否存在 `error`，均进入 `finallyHandler` 执行，等效于 `.then(successHandler, errorHandler)`。返回一个新的 `Thenjs` 对象。

+ **finallyHandler:** Function，function (cont, error, value1, value2, ...) {}

### Thenjs.prototype.fail(errorHandler)

别名：Thenjs.prototype.catch(errorHandler)

`fail` 用于捕捉 `error`，如果在它之前的任意一个链上产生了 `error`，并且未被 `then`, `finally` 等捕获，则会跳过中间链，直接进入 `fail`。返回一个新的 `Thenjs` 对象。

+ **errorHandler:** Function，function (cont, error) {}

### Thenjs.prototype.each(array, iterator)

参数类似 `Thenjs.each`，返回一个新的 `Thenjs` 对象。

不同在于，参数可省略，如果没有参数，则会查找上一个链的输出结果作为参数，即上一个链可以这样 `cont(null, array, iterator)` 传输参数到each。下面三个队列方法行为类似。

### Thenjs.prototype.eachSeries(array, iterator)

参数类似 `Thenjs.eachSeries`，返回一个新的 `Thenjs` 对象。

### Thenjs.prototype.parallel(taskFnArray)

参数类似 `Thenjs.parallel`，返回一个新的 `Thenjs` 对象。

### Thenjs.prototype.series(taskFnArray)

参数类似 `Thenjs.series`，返回一个新的 `Thenjs` 对象。

### Thenjs.prototype.toThunk()(callback)

无返回值。将 `Thenjs` 对象变成一个 `thunk`， 当 `Thenjs` 对象任务执行完毕后，结果会进入 `callback` 执行。`callback` 的第一个参数仍然是 `error`。

### Thenjs.nextTick(callback, arg1, arg2, ...)

工具函数，类似于 `node.js` 的 `setImmediate`，异步执行 `callback`，而 `arg1`, `arg2` 会成为它的运行参数。

### Thenjs.defer(errorHandler, callback, arg1, arg2, ...)

工具函数，类似于 `Thenjs.nextTick`，不同的是异步使用 `try catch` 执行 `callback`，如果捕捉到 `error`，则进入 `errorHandler` 执行。

+ **errorHandler:** Function，function (error) {}

### Thenjs.onerror = function (error) {};

全局配置参数，用户可自定义的全局 error 监听函数，`Thenjs.onerror` 默认值为 `undefined`。若定义，当执行链上发生 `error` 且没有被捕捉时，`error` 会进入 `Thenjs.onerror`。

### Thenjs.maxTickDepth = 100;

全局配置参数， 默认值为 `100`。如果同步任务串行执行，嵌套深度达到一定值时，javascript 会报错 `Maximum call stack size exceeded`，`Thenjs.maxTickDepth` 就是为了解决这个问题，当串行任务流执行深度达到 `maxTickDepth` 值时，强制异步执行一次。


### Thunk

**`thunk`** 这一概念，我最初见于 **TJ Holowaychuk** 的 [co](https://github.com/visionmedia/co)。**`thunk`** 是一个被封装了同步或异步任务的函数，这个函数有唯一一个参数 `callback`。运行 **`thunk`**后，当其封装的任务执行完毕时，任务结果会输入 `callback` 执行。`callback` 的第一个参数是 `error`，没有发生 `error` 则为 `null`。


### Who Used

 + AngularJS中文社区：<http://angularjs.cn/>
 + Teambition：<http://teambition.com/>


## Examples

更多使用案例请参考[jsGen](https://github.com/zensh/jsgen)源代码！
