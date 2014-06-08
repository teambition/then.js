// v1.1.4 [![Build Status](https://travis-ci.org/zensh/then.js.png?branch=master)](https://travis-ci.org/zensh/then.js)
//
// 小巧、简单、强大的链式异步编程工具！
//
// **Github:** https://github.com/teambition/then.js
//
// **License:** MIT

/* global module, define, setImmediate, console */
(function (root, factory) {
  'use strict';

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.thenjs = factory();
  }
}(this, function () {
  'use strict';

  var slice = Array.prototype.slice, toString = Object.prototype.toString,
    // nextTick 用于异步执行函数，避免 `Maximum call stack size exceeded`
    // MutationObserver 和 MessageChannel 目前不适合用来模拟 setImmediate, 无法正常 GC
    nextTick = typeof setImmediate === 'function' ? setImmediate : function (fn) {
      setTimeout(fn, 0);
    },
    isArray = Array.isArray || function (obj) {
      return toString.call(obj) === '[object Array]';
    };

  // ## **Thenjs** 构造函数
  function Thenjs() {}

  var prototype = Thenjs.prototype;

  // 参数不合法时生成相应的错误
  function errorify(obj, method, type) {
    return new Error('Argument ' + (obj && obj.toString()) + ' in "' + method +
      '" is not a ' + (type || 'array') + '!');
  }

  // 同步执行函数，同时捕捉异常
  function carry(errorHandler, fn) {
    try {
      fn.apply(null, slice.call(arguments, 2));
    } catch (error) {
      errorHandler(error);
    }
  }

  // 异步执行函数，同时捕捉异常
  function defer(errorHandler, fn) {
    var args = slice.call(arguments, 2);
    nextTick(function () {
      try {
        fn.apply(null, args);
      } catch (error) {
        errorHandler(error);
      }
    });
  }

  // 默认的 `debug` 方法
  function defaultDebug() {
    console.log.apply(console, arguments);
  }

  // 核心 **continuation** 方法
  // **continuation** 收集任务结果，触发下一个链，它被注入各个 handler
  // 其参数采用 **node.js** 的 **callback** 形式：(error, arg1, arg2, ...)
  function continuation(error) {
    var self = this;

    // then链上的结果已经处理，若重复执行 cont 则直接跳过；
    if (self._result === false) return;
    // 第一次进入 continuation，若为 debug 模式则执行，对于同一结果保证 debug 只执行一次；
    if (!self._result && self._chain) {
      self.debug.apply(self, ['\nChain ' + self._chain + ': '].concat(slice.call(arguments)));
    }
    // 标记已进入 continuation 处理
    self._result = false;

    try {
      continuationExec(self, arguments, error);
    } catch (err) {
      continuationError(self, err, error);
    }
  }

  function continuationExec(ctx, result, error) {
    if (ctx._finally) return ctx._finally.apply(null, result);
    if (error != null) throw error;

    var success = ctx._success || ctx._each || ctx._eachSeries || ctx._parallel || ctx._series;
    if (success) return success.apply(null, slice.call(result, 1));
    // 对于正确结果，**Thenjs** 链上没有相应 handler 处理，则在 **Thenjs** 链上保存结果，等待下一次处理。
    ctx._result = result;
  }

  function continuationError(ctx, err, error) {
    var _nextThen = ctx, errorHandler = ctx._error || ctx._fail;
    // 本次 continuation 捕捉的 error，直接放到下一链处理
    if (ctx._nextThen && error == null) return continuation.call(ctx._nextThen, err);
    // 获取本链的 error handler 或者链上后面的fail handler
    while (!errorHandler && _nextThen) {
      errorHandler = _nextThen._fail;
      _nextThen = _nextThen._nextThen;
    }
    if (errorHandler) return errorHandler(err);
    // 如果定义了全局 **onerror**，则用它处理
    if (thenjs.onerror) return thenjs.onerror(err);
    // 对于 error，如果没有任何 handler 处理，则保存到链上最后一个 **Thenjs** 对象，等待下一次处理。
    _nextThen._result = [err];
  }

  // 注入 cont，执行 fn，并返回新的 **Thenjs** 对象
  function thenFactory(fn, ctx, debug) {
    var then = new Thenjs();

    function cont() {
      return continuation.apply(then, arguments);
    }
    // 标记 cont，cont 作为 handler 时不会被注入 cont，见 `wrapTaskHandler`
    cont._isCont = true;
    // 设置并开启 debug 模式
    if (debug) {
      prototype.debug = typeof debug === 'function' ? debug : defaultDebug;
      then._chain = 1;
    }
    // 注入 cont，初始化 handler
    fn(cont, ctx);
    if (!ctx) return then;
    ctx._nextThen = then;
    if (ctx._chain) then._chain = ctx._chain + 1;
    // 检查上一链的结果是否处理，未处理则处理，用于续接 **Thenjs** 链
    if (ctx._result) {
      nextTick(function () {
        continuation.apply(ctx, ctx._result);
      });
    }
    return then;
  }

  // 封装 handler，`_isCont` 判定 handler 是不是 `cont` ，不是则将 `cont` 注入成第一个参数
  function wrapTaskHandler(cont, handler) {
    return handler._isCont ? handler : function () {
      handler.apply(null, [cont].concat(slice.call(arguments)));
    };
  }

  // 用于生成 `each` 和 `parallel` 的 `next`
  function parallelNext(cont, result, counter, i) {
    function next(error, value) {
      if (counter.finished) return;
      if (error != null) return (counter.finished = true, cont(error));
      result[i] = value;
      return --counter.i < 0 && cont(null, result);
    }
    next._isCont = true;
    return next;
  }

  // ## **each** 函数
  // 将一组数据 `array` 分发给任务迭代函数 `iterator`，并行执行，`cont` 处理最后结果
  function each(cont, array, iterator) {
    var end, result = [], counter = {};

    if (!isArray(array)) return cont(errorify(array, 'each'));
    counter.i = end = array.length - 1;
    if (end < 0) return cont(null, result);

    for (var i = 0; i <= end; i++) {
      iterator(parallelNext(cont, result, counter, i), array[i], i, array);
    }
  }

  // ## **parallel** 函数
  // 并行执行一组 `array` 任务，`cont` 处理最后结果
  function parallel(cont, array) {
    var end, result = [], counter = {};

    if (!isArray(array)) return cont(errorify(array, 'parallel'));
    counter.i = end = array.length - 1;
    if (end < 0) return cont(null, result);

    for (var i = 0; i <= end; i++) {
      array[i](parallelNext(cont, result, counter, i), i, array);
    }
  }

  // ## **eachSeries** 函数
  // 将一组数据 `array` 分发给任务迭代函数 `iterator`，串行执行，`cont` 处理最后结果
  function eachSeries(cont, array, iterator) {
    var i = 0, end, result = [], run, stack, maxTickDepth = +thenjs.maxTickDepth;

    function next(error, value) {
      if (error != null) return cont(error);
      result[i] = value;
      if (++i > end) return cont(null, result);
      // 先同步执行，嵌套达到 maxTickDepth 时转成一次异步执行
      run = --stack ? carry : (stack = maxTickDepth, defer);
      run(cont, iterator, next, array[i], i, array);
    }
    next._isCont = true;
    stack = maxTickDepth = maxTickDepth >= 1 ? maxTickDepth : 100;

    if (!isArray(array)) return cont(errorify(array, 'eachSeries'));
    end = array.length - 1;
    if (end < 0) return cont(null, result);
    iterator(next, array[0], 0, array);
  }

  // ## **series** 函数
  // 串行执行一组 `array` 任务，`cont` 处理最后结果
  function series(cont, array) {
    var i = 0, end, result = [], run, stack, maxTickDepth = +thenjs.maxTickDepth;

    function next(error, value) {
      if (error != null) return cont(error);
      result[i] = value;
      if (++i > end) return cont(null, result);
      // 先同步执行，嵌套达到 maxTickDepth 时转成一次异步执行
      run = --stack ? carry : (stack = maxTickDepth, defer);
      run(cont, array[i], next, i, array);
    }
    next._isCont = true;
    stack = maxTickDepth = maxTickDepth >= 1 ? maxTickDepth : 100;

    if (!isArray(array)) return cont(errorify(array, 'series'));
    end = array.length - 1;
    if (end < 0) return cont(null, result);
    array[0](next, 0, array);
  }

  // **Thenjs** 对象上的 **finally** 方法，`all` 将废弃
  prototype.fin = prototype.all = prototype.finally = function (finallyHandler) {
    return thenFactory(function (cont, self) {
      self._finally = wrapTaskHandler(cont, finallyHandler);
    }, this);
  };

  // **Thenjs** 对象上的 **then** 方法
  prototype.then = function (successHandler, errorHandler) {
    return thenFactory(function (cont, self) {
      self._success = wrapTaskHandler(cont, successHandler);
      self._error = errorHandler && wrapTaskHandler(cont, errorHandler);
    }, this);
  };

  // **Thenjs** 对象上的 **fail** 方法
  prototype.fail = prototype.catch = function (errorHandler) {
    return thenFactory(function (cont, self) {
      self._fail = wrapTaskHandler(cont, errorHandler);
      // 对于链上的 fail 方法，如果无 error ，则穿透该链，将结果输入下一链
      self._success = function () {
        cont.apply(null, [null].concat(slice.call(arguments)));
      };
    }, this);
  };

  // **Thenjs** 对象上的 **each** 方法
  prototype.each = function (array, iterator) {
    return thenFactory(function (cont, self) {
      self._each = function (dArray, dIterator) {
        // 优先使用定义的参数，如果没有定义参数，则从上一链结果从获取
        // `dArray`, `dIterator` 来自于上一链的 **cont**，下同
        each(cont, array || dArray, iterator || dIterator);
      };
    }, this);
  };

  // **Thenjs** 对象上的 **eachSeries** 方法
  prototype.eachSeries = function (array, iterator) {
    return thenFactory(function (cont, self) {
      self._eachSeries = function (dArray, dIterator) {
        eachSeries(cont, array || dArray, iterator || dIterator);
      };
    }, this);
  };

  // **Thenjs** 对象上的 **parallel** 方法
  prototype.parallel = function (array) {
    return thenFactory(function (cont, self) {
      self._parallel = function (dArray) {
        parallel(cont, array || dArray);
      };
    }, this);
  };

  // **Thenjs** 对象上的 **series** 方法
  prototype.series = function (array) {
    return thenFactory(function (cont, self) {
      self._series = function (dArray) {
        series(cont, array || dArray);
      };
    }, this);
  };

  // 对外输出的主函数
  function thenjs(startFn, debug) {
    // 使用 new 则同步生成一个 **Thenjs** 对象
    var run = this instanceof thenjs ? carry : defer;
    return thenFactory(function (cont) {
      if (!startFn) return cont();
      run(cont, startFn, cont);
    }, null, debug);
  }

  thenjs.each = function (array, iterator, debug) {
    return thenFactory(function (cont) {
      defer(cont, each, cont, array, iterator);
    }, null, debug);
  };

  thenjs.eachSeries = function (array, iterator, debug) {
    return thenFactory(function (cont) {
      defer(cont, eachSeries, cont, array, iterator);
    }, null, debug);
  };

  thenjs.parallel = function (array, debug) {
    return thenFactory(function (cont) {
      defer(cont, parallel, cont, array);
    }, null, debug);
  };

  thenjs.series = function (array, debug) {
    return thenFactory(function (cont) {
      defer(cont, series, cont, array);
    }, null, debug);
  };

  thenjs.nextTick = function (fn) {
    var args = slice.call(arguments, 1);
    nextTick(function () {
      fn.apply(null, args);
    });
  };

  thenjs.defer = defer;
  // 串行任务流嵌套深度达到`maxTickDepth`时，强制异步执行，
  // 用于避免同步任务流过深导致的`Maximum call stack size exceeded`
  thenjs.maxTickDepth = 100;
  // 全局 error 监听
  thenjs.onerror = function (error) {
    console.error('thenjs caught error: ', error);
    throw error;
  };
  return thenjs;
}));
