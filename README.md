then.js
====
史上最快，与 node callback 完美结合的异步流程控制库!

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]

**能用简单优美的方式将任何同步或异步回调函数转换成then()链式调用！**

**你可以在服务器端（node.js）或浏览器中使用then.js，兼容ie6/7/8。**

## 特征

1. 可以像标准的 `Promise` 那样，把N多异步回调函数写成一个长长的 `then` 链，并且比 Promise 更简洁自然。因为如果使用标准 Promise 的 then 链，其中的异步函数都必须转换成 Promise，Thenjs 则无需转换，像使用 callback 一样执行异步函数即可。

2. 可以像 `async`那样实现同步或异步队列函数，并且比 async 更方便。因为 async 的队列是一个个独立体，而 Thenjs 的队列在 `Thenjs` 链上，可形成链式调用。

3. 强大的 Error 机制，可以捕捉任何同步或异步的异常错误，甚至是位于异步函数中的语法错误。并且捕捉的错误任君处置。

4. 开启debug模式，可以把每一个then链运行结果输出到debug函数（未定义debug函数则用 console.log），方便调试。

## Thunk

**`thunk`** 是一个被封装了同步或异步任务的函数，这个函数有唯一一个参数 `callback`。运行 **`thunk`**后，当其封装的任务执行完毕时，任务结果会输入 `callback` 执行。`callback` 的第一个参数是 `error`，没有发生 `error` 则为 `null`。

**推荐使用新一代异步流程控制库 [thunks](https://github.com/thunks/thunks)，它是比 `co` 更强大的存在！**

##Benchmark

**模拟异步测试：**

```bash
➜  then.js git:(master) ✗ node --harmony benchmark/index
Async Benchmark...

JSBench Start (1000 cycles, async mode):
Test Promise...
Test co...
Test thunks-generator...
Test bluebird...
Test when...
Test RSVP...
Test async...
Test thenjs...
Test thunks...

JSBench Results:
co: 1000 cycles, 32.621 ms/cycle, 30.655 ops/sec
Promise: 1000 cycles, 30.807 ms/cycle, 32.460 ops/sec
when: 1000 cycles, 28.828 ms/cycle, 34.688 ops/sec
thunks: 1000 cycles, 17.402 ms/cycle, 57.465 ops/sec
RSVP: 1000 cycles, 10.358 ms/cycle, 96.544 ops/sec
thunks-generator: 1000 cycles, 9.822 ms/cycle, 101.812 ops/sec
bluebird: 1000 cycles, 8.54 ms/cycle, 117.096 ops/sec
async: 1000 cycles, 6.54 ms/cycle, 152.905 ops/sec
thenjs: 1000 cycles, 5.085 ms/cycle, 196.657 ops/sec

co: 100%; Promise: 105.89%; when: 113.16%; thunks: 187.46%; RSVP: 314.94%; thunks-generator: 332.12%; bluebird: 381.98%; async: 498.79%; thenjs: 641.51%;

JSBench Completed!
```

**模拟异步测试：**

```bash
➜  then.js git:(master) ✗ node --harmony benchmark/index
Sync Benchmark...

JSBench Start (1000 cycles, async mode):
Test Promise...
Test co...
Test thunks-generator...
Test bluebird...
Test when...
Test RSVP...
Test async...
Test thenjs...
Test thunks...

JSBench Results:
co: 1000 cycles, 26.342 ms/cycle, 37.962 ops/sec
Promise: 1000 cycles, 25.662 ms/cycle, 38.968 ops/sec
when: 1000 cycles, 21.36 ms/cycle, 46.816 ops/sec
thunks: 1000 cycles, 5.242 ms/cycle, 190.767 ops/sec
thunks-generator: 1000 cycles, 5.073 ms/cycle, 197.122 ops/sec
async: 1000 cycles, 2.806 ms/cycle, 356.379 ops/sec
RSVP: 1000 cycles, 2.27 ms/cycle, 440.529 ops/sec
bluebird: 1000 cycles, 1.722 ms/cycle, 580.720 ops/sec
thenjs: 1000 cycles, 1.324 ms/cycle, 755.287 ops/sec

co: 100%; Promise: 102.65%; when: 123.32%; thunks: 502.52%; thunks-generator: 519.26%; async: 938.77%; RSVP: 1160.44%; bluebird: 1529.73%; thenjs: 1989.58%;

JSBench Completed!
```

**`async` 不支持过长（如超过3000）的同步任务（将会出现`Maximum call stack size exceeded`）**

## Demo

```js
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
})
.then(function (cont, arg) {
  console.log(arg);
  cont(new Error('error!'), 123);
})
.fin(function (cont, error, result) {
  console.log(error, result);
  cont();
})
.each([0, 1, 2], function (cont, value) {
  task(value * 2, cont); // 并行执行队列任务，把队列 list 中的每一个值输入到 task 中运行
})
.then(function (cont, result) {
  console.log(result);
  cont();
})
.series([ // 串行执行队列任务
  function (cont) { task(88, cont); }, // 队列第一个是异步任务
  function (cont) { cont(null, 99); } // 第二个是同步任务
])
.then(function (cont, result) {
  console.log(result);
  cont(new Error('error!!'));
})
.fail(function (cont, error) { // 通常应该在链的最后放置一个 `fail` 方法收集异常
  console.log(error);
  console.log('DEMO END!');
});
```

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

```js
Thenjs().then(function(res) {});
```

```js
Thenjs(123).then(function(res) {});
```

```js
Thenjs(promise).then(function(res) {});
```

```js
Thenjs(function(cont) { cont(result); }).then(function(res) {});
```

### Thenjs.each(array, iterator, [debug])

将 `array` 中的值应用于 `iterator` 函数（同步或异步），并行执行。返回一个新的 `Thenjs` 对象。

+ **array:** Array 或 类数组
+ **iterator:** Function，function (cont, value, index, array) {}

```js
Thenjs.each([0, 1, 2], function (cont, value) {
  task(value * 2, cont);
})
.then(function (cont, result) {
  console.log(result);
});
```

### Thenjs.eachSeries(array, iterator, [debug])

将 `array` 中的值应用于 `iterator` 函数（同步或异步），串行执行。返回一个新的 `Thenjs` 对象。

+ **array:** Array 或 类数组
+ **iterator:** Function，function (cont, value, index, array) {}

```js
Thenjs.eachSeries([0, 1, 2], function (cont, value) {
  task(value * 2, cont);
})
.then(function (cont, result) {
  console.log(result);
});
```

### Thenjs.parallel(taskFnArray, [debug])

`taskFnArray` 是一个函数（同步或异步）数组，并行执行。返回一个新的 `Thenjs` 对象。

+ **taskFnArray:** Array，[taskFn1, taskFn2, taskFn3, ...]，其中，taskFn 形式为 function (cont) {}

```js
Thenjs.parallel([
  function (cont) { task(88, cont); },
  function (cont) { cont(null, 99); }
])
.then(function (cont, result) {
  console.log(result);
});
```

### Thenjs.series(taskFnArray, [debug])

`taskFnArray` 是一个函数（同步或异步）数组，串行执行。返回一个新的 `Thenjs` 对象。

+ **taskFnArray:** Array，[taskFn1, taskFn2, taskFn3, ...]，其中，taskFn 形式为 function (cont) {}

```js
Thenjs.series([
  function (cont) { task(88, cont); },
  function (cont) { cont(null, 99); }
])
.then(function (cont, result) {
  console.log(result);
});
```

### Thenjs.prototype.then(successHandler, [errorHandler])

如果上一链正确，则进入 `successHandler` 执行，否则进入 `errorHandler` 执行。返回一个新的 `Thenjs` 对象。

+ **successHandler:** Function，function (cont, value1, value2, ...) {}
+ **errorHandler:** Function，可选，function (cont, error) {}

```js
Thenjs(function (cont) {
  task(10, cont);
})
.then(function (cont, arg) {
  console.log(arg);
}, function (cont, error) {
  console.error(error);
});
```

### Thenjs.prototype.finally(finallyHandler)

别名：Thenjs.prototype.fin(finallyHandler)

原名`all`已停用。

无论上一链是否存在 `error`，均进入 `finallyHandler` 执行，等效于 `.then(successHandler, errorHandler)`。返回一个新的 `Thenjs` 对象。

+ **finallyHandler:** Function，function (cont, error, value1, value2, ...) {}

`finallyHandler` 也可以是外层的 `cont` 哦，如果是 `cont`, 则不会被注入本层的 cont, 所以，可以这样嵌套用：

```js
Thenjs(function (cont) {
  task(10, cont);
})
.then(function (cont, arg) {
  console.log(arg);
  Thenjs(function (cont2) {
    task(10, cont2);
  })
  .then(function (cont2, arg) {
    console.log(arg);
    cont2(new Error('error!'), 123);
  })
  .fin(cont);
})
.fin(function (cont, error, result) {
  console.log(error, result);
  cont();
});
```
在复杂的异步组合中是很有用的。


### Thenjs.prototype.fail(errorHandler)

别名：Thenjs.prototype.catch(errorHandler)

`fail` 用于捕捉 `error`，如果在它之前的任意一个链上产生了 `error`，并且未被 `then`, `finally` 等捕获，则会跳过中间链，直接进入 `fail`。返回一个新的 `Thenjs` 对象。

+ **errorHandler:** Function，function (cont, error) {}

类似 `.finally(finallyHandler)` ，这里的 `errorHandler` 也可以是 `cont` ：

```js
Thenjs(function (cont) {
  task(10, cont);
})
.then(function (cont, arg) {
  console.log(arg);
  Thenjs(function (cont2) {
    task(10, cont2);
  })
  .then(function (cont2, arg) {
    console.log(arg);
    cont2(new Error('error!'), 123);
  })
  .fail(cont);
})
.then(function (cont, result) {
  console.log(result);
})
.fail(function (cont, error) {
  console.error(error);
});
```

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

返回 `thunk` 函数。将 `Thenjs` 对象变成一个 `thunk`， 当 `Thenjs` 对象任务执行完毕后，结果会进入 `callback` 执行。`callback` 的第一个参数仍然是 `error`。

```js
var thunk = Thenjs(function (cont) {
  task(10, cont);
})
.then(function (cont, arg) {
  console.log(arg);
  Thenjs(function (cont2) {
    task(10, cont2);
  })
  .then(function (cont2, arg) {
    console.log(arg);
    cont2(new Error('error!'), 123);
  })
  .fail(cont);
})
.then(function (cont, result) {
  console.log(result);
})
.toThunk();

thunk(function (error, result) {
  console.log(error, result);
});
```

### Thenjs.nextTick(callback, arg1, arg2, ...)

工具函数，类似于 `node.js` 的 `setImmediate`，异步执行 `callback`，而 `arg1`, `arg2` 会成为它的运行参数。

### Thenjs.defer(errorHandler, callback, arg1, arg2, ...)

工具函数，类似于 `Thenjs.nextTick`，不同的是异步使用 `try catch` 执行 `callback`，如果捕捉到 `error`，则进入 `errorHandler` 执行。

+ **errorHandler:** Function，function (error) {}

### Thenjs.onerror = function (error) {};

全局配置参数，用户可自定义的全局 error 监听函数，`Thenjs.onerror` 默认值为 `undefined`。若定义，当执行链上发生 `error` 且没有被捕捉时，`error` 会进入 `Thenjs.onerror`。


### Who Used

+ AngularJS中文社区：<http://angularjs.cn/>
+ Teambition：<http://teambition.com/>


## Examples

更多使用案例请参考[jsGen](https://github.com/zensh/jsgen)源代码！

[npm-url]: https://npmjs.org/package/thenjs
[npm-image]: http://img.shields.io/npm/v/thenjs.svg

[travis-url]: https://travis-ci.org/teambition/then.js
[travis-image]: http://img.shields.io/travis/teambition/then.js.svg
