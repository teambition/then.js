// v1.0.0 [![Build Status](https://travis-ci.org/zensh/then.js.png?branch=master)](https://travis-ci.org/zensh/then.js)
//
// 小巧、简单、强大的链式异步编程工具！
//
// **Github:** https://github.com/teambition/then.js
//
// **License:** MIT

/* global module, define, setImmediate, console */
(function () {
  'use strict';

  var slice = [].slice,
    // nextTick 用于异步执行函数，避免 `Maximum call stack size exceeded`
    // MutationObserver 和 MessageChannel 目前不适合用来模拟 setImmediate, 无法正常 GC
    nextTick = typeof setImmediate === 'function' ? setImmediate : function (fn) {
      setTimeout(fn, 0);
    },
    isArray = Array.isArray || function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };

  function isNull(obj) {
    return obj == null;
  }

  function isFunction(fn) {
    return typeof fn === 'function';
  }

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

  // 用于生成 `each` 和 `parallel` 的 `next`
  function parallelNext(cont, result, counter, i) {
    function next(error, value) {
      if (!isNull(error)) return cont(error);
      result[i] = value;
      return --counter.i < 0 && cont(null, result);
    }
    next._isCont = true;
    return next;
  }

  // ##内部 **each** 函数
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

  // ##内部 **parallel** 函数
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

  // ##内部 **eachSeries** 函数
  // 将一组数据 `array` 分发给任务迭代函数 `iterator`，串行执行，`cont` 处理最后结果
  function eachSeries(cont, array, iterator) {
    var i = 0, end, result = [], run, stack = thenjs.maxTickDepth;

    function next(err, value) {
      if (!isNull(err)) return cont(err);
      result[i] = value;
      if (++i > end) return cont(null, result);
      run = --stack ? carry : (stack = thenjs.maxTickDepth, defer);
      run(cont, iterator, next, array[i], i, array);
    }
    next._isCont = true;

    if (!isArray(array)) return cont(errorify(array, 'eachSeries'));
    end = array.length - 1;
    if (end < 0) return cont(null, result);
    iterator(next, array[i], i, array);
  }

  // ##内部 **series** 函数
  // 串行执行一组 `array` 任务，`cont` 处理最后结果
  function series(cont, array) {
    var i = 0, end, result = [], run, stack = thenjs.maxTickDepth;

    function next(err, value) {
      if (!isNull(err)) return cont(err);
      result[i] = value;
      if (++i > end) return cont(null, result);
      run = --stack ? carry : (stack = thenjs.maxTickDepth, defer);
      run(cont, array[i], next, i, array);
    }
    next._isCont = true;

    if (!isArray(array)) return cont(errorify(array, 'series'));
    end = array.length - 1;
    if (end < 0) return cont(null, result);
    array[i](next, i, array);
  }

  // 封装 handler，`_isCont` 判定 handler 是不是 `cont` ，不是则将 `cont` 注入成第一个参数
  function wrapTaskHandler(cont, handler) {
    return handler._isCont ? handler : function () {
      handler.apply(null, [cont].concat(slice.call(arguments)));
    };
  }

  // ##内部 **Thenjs** 构造函数
  // 所有 **Then** 链从此继承
  function Thenjs() {}

  // 定义默认 `debug` 方法
  Thenjs.prototype.debug = typeof console === 'object' && function () {
    console.log.apply(console, arguments);
  };

  // ##内部 **Then** 构造函数
  // 每一条 **Then** 链的所有 **Then** 对象继承于共同的 **Then** 构造函数
  // 不同的 **Then** 链的 **Then** 构造函数不同，但都继承于 **Thenjs** 构造函数
  function closureThen(debug) {

    // 新的 **Then** 构造函数
    function Then() {}
    // 继承于 **Thenjs** 构造函数
    var prototype = Then.prototype = new Thenjs(),
      // 保存该链上的所有 `fail` 方法，用于夸链处理 error
      fail = [],
      // 链计数器，用于 debug 模式
      chain = 0;

    // 内部核心 **continuation** 方法
    // **continuation** 收集任务结果，触发下一个链，它被注入各个 handler
    // 其参数采用 **node.js** 的 **callback** 形式：(error, arg1, arg2, ...)
    function continuation(err) {
      var errorHandler, successHandler, self = this, args = arguments;

      // then链上的结果已经处理，若重复执行 cont 则直接跳过；
      if (self._result === false) return;
      if (self._result) {
        // _result 已存在，表明上一次 cont 没有 handler 处理
        // 这是第二次进入 cont 继续处理，并标记结果已处理，这是由续接 **Then** 链触发
        self._result = false;
      } else if (self.debug) {
        // 表明这是第一次进入 cont，若存在 debug 则执行，对于同一结果保证 debug 只执行一次；
        self.debug.apply(self, ['\nChain ' + (++chain) + ': '].concat(slice.call(args)));
      }

      errorHandler = self._fail ? fail.shift() : self._error;
      successHandler = self._success || self._each || self._eachSeries || self._parallel || self._series;

      function execute() {
        if (self._all) return self._all.apply(null, args);
        if (!isNull(err)) throw err;
        if (successHandler) {
          successHandler.apply(null, slice.call(args, 1));
        } else {
          // 对于正确结果，**Then** 链上没有相应 handler 处理，则在 **Then** 链上保存结果，等待下一次处理。
          self._result = args;
        }
      }

      function dealError(error) {
        error.stack = error.stack || error.description;
        if (isNull(err) && self._nextThen) {
          // 本次 cont 捕捉的 error，直接放到下一链处理
          continuation.call(self._nextThen, error);
        } else if (errorHandler || fail.length) {
          // 获取本链的 error handler 或者链上的fail handler
          errorHandler = errorHandler || fail.shift();
          errorHandler.call(null, error);
        } else if (isFunction(thenjs.onerror)) {
          // 如果定义了全局 **onerror**，则用它处理
          thenjs.onerror(error);
        } else {
          // 对于 error，**Then** 链上没有相应 handler 处理，则保存结果，等待下一次处理。
          self._result = [error];
        }
      }

      try {
        execute();
      } catch (error) {
        dealError(error);
      }
    }

    // 注入 cont，执行 fn，并返回新的 **Then** 对象
    function thenFactory(fn, context) {
      var then = new Then(),
        cont = function () {
          return continuation.apply(then, arguments);
        };
      // 标记 cont，cont 作为 handler 时不会被注入 cont，见 `wrapTaskHandler`
      cont._isCont = true;
      // 注入 cont
      fn(cont, context);
      if (context) {
        context._nextThen = then;
        // 检查上一链的结果是否处理，未处理则处理，用于续接 **Then** 链
        if (context._result) {
          nextTick(function () {
            continuation.apply(context, context._result);
          });
        }
      }
      return then;
    }

    prototype.constructor = Then;

    // **Then** 对象上的 **all** 方法
    prototype.all = function (allHandler) {
      return thenFactory(function (cont, self) {
        self._all = wrapTaskHandler(cont, allHandler);
      }, this);
    };

    // **Then** 对象上的 **then** 方法
    prototype.then = function (successHandler, errorHandler) {
      return thenFactory(function (cont, self) {
        self._success = wrapTaskHandler(cont, successHandler);
        self._error = errorHandler && wrapTaskHandler(cont, errorHandler);
      }, this);
    };

    // **Then** 对象上的 **fail** 方法
    prototype.fail = function (errorHandler) {
      return thenFactory(function (cont, self) {
        self._fail = wrapTaskHandler(cont, errorHandler);
        // 对于链上的 fail 方法，如果无 error ，则穿透该链，将结果输入下一链
        self._success = function () {
          cont.apply(null, [null].concat(slice.call(arguments)));
        };
        // 将 fail 存入闭包，使得在此链之前产生的 error 也能被 fail 捕捉
        fail.push(self._fail);
      }, this);
    };

    // **Then** 对象上的 **each** 方法
    prototype.each = function (array, iterator) {
      return thenFactory(function (cont, self) {
        self._each = function (dArray, dIterator) {
          // 优先使用定义的参数，如果没有定义参数，则从上一链结果从获取
          // `dArray`, `dIterator` 来自于上一链的 **cont**，下同
          each(cont, array || dArray, iterator || dIterator);
        };
      }, this);
    };

    // **Then** 对象上的 **eachSeries** 方法
    prototype.eachSeries = function (array, iterator) {
      return thenFactory(function (cont, self) {
        self._eachSeries = function (dArray, dIterator) {
          eachSeries(cont, array || dArray, iterator || dIterator);
        };
      }, this);
    };

    // **Then** 对象上的 **parallel** 方法
    prototype.parallel = function (array) {
      return thenFactory(function (cont, self) {
        self._parallel = function (dArray) {
          parallel(cont, array || dArray);
        };
      }, this);
    };

    // **Then** 对象上的 **series** 方法
    prototype.series = function (array) {
      return thenFactory(function (cont, self) {
        self._series = function (dArray) {
          series(cont, array || dArray);
        };
      }, this);
    };

    // 是否开启 **debug** 模式，若开启，则将每一步的结果输入 `debug` 方法
    if (!debug || isFunction(debug)) prototype.debug = debug;
    return thenFactory;
  }

  // 对外输出的主函数
  function thenjs(startFn, debug) {
    return closureThen(debug)(function (cont) {
      defer(cont, startFn, cont);
    });
  }

  thenjs.each = function (array, iterator, debug) {
    return closureThen(debug)(function (cont) {
      defer(cont, each, cont, array, iterator);
    });
  };

  thenjs.eachSeries = function (array, iterator, debug) {
    return closureThen(debug)(function (cont) {
      defer(cont, eachSeries, cont, array, iterator);
    });
  };

  thenjs.parallel = function (array, debug) {
    return closureThen(debug)(function (cont) {
      defer(cont, parallel, cont, array);
    });
  };

  thenjs.series = function (array, debug) {
    return closureThen(debug)(function (cont) {
      defer(cont, series, cont, array);
    });
  };

  thenjs.nextTick = function (fn) {
    var args = slice.call(arguments, 1);
    nextTick(function () {
      fn.apply(null, args);
    });
  };

  thenjs.defer = defer;

  // 串行任务流嵌套深度达到`maxTickDepth`时，强制异步执行，用于避免同步任务流过深导致的`Maximum call stack size exceeded`
  thenjs.maxTickDepth = 100;

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = thenjs;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {return thenjs;});
  } else if (typeof window === 'object') {
    window.thenjs = thenjs;
  }
}());
