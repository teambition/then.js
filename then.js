// v0.12.0 [![Build Status](https://travis-ci.org/zensh/then.js.png?branch=master)](https://travis-ci.org/zensh/then.js)
//
// 小巧、简单、强大的链式异步编程工具！
//
// **Github:** https://github.com/teambition/then.js
//
// **License:** MIT

'use strict';
/* global module, define, setImmediate, console, MutationObserver, MessageChannel */
(function () {
  var slice = [].slice,
    // nextTick 用于异步执行函数，避免 `Maximum call stack size exceeded`
    nextTick = typeof setImmediate === 'function' ? setImmediate : function (fn) {
      setTimeout(fn, 0);
    },
    // 兼容 ES3 的 `isArray`
    isArray = Array.isArray || function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };

  // 浏览器端的 setImmediate
  if (typeof MutationObserver === 'function') {
    nextTick = function (fn) {
      var element = document.createElement('div'),
        observer = new MutationObserver(function () {
          observer.disconnect();
          return fn();
        });
      observer.observe(element, {attributes: true});
      element.setAttribute('id', 1);
    };
  } else if (typeof MessageChannel === 'function') {
    nextTick = function (fn) {
      var channel = new MessageChannel();
      channel.port1.onmessage = function () {
        return fn();
      };
      channel.port2.postMessage(0);
    };
  }

  // 内部 `bind` 实现，比原生 `bind` 快！
  function bind(fn, context) {
    var args = slice.call(arguments, 2);
    return function () {
      return fn.apply(context, args.concat(slice.call(arguments)));
    };
  }

  function isNull(obj) {
    return obj == null;
  }

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  // 参数不合法时生成相应的错误
  function errorify(obj, method, type) {
    type = type || 'array';
    return new Error('Argument ' + (obj && obj.toString()) + ' in "' + method + '" is not a ' + type + '!');
  }

  // 用于生成 `each` 和 `parallel` 的 `next`
  function parallelNext(defer, result, counter, i) {
    function next(error, value) {
      if (!isNull(error)) return defer(error);
      result[i] = value;
      return --counter.i < 0 && defer(null, result);
    }
    next._self = true;
    return next;
  }

  // ##内部 **each** 函数
  // 将一组数据 `array` 分发给任务迭代函数 `iterator`，并行执行，`defer` 处理最后结果
  function each(defer, array, iterator) {
    var end, result = [], counter = {};

    if (!isArray(array)) return defer(errorify(array, 'each'));
    counter.i = end = array.length - 1;
    if (end < 0) return defer(null, result);

    for (var i = 0; i <= end; i++) {
      iterator(parallelNext(defer, result, counter, i), array[i], i, array);
    }
  }

  // ##内部 **parallel** 函数
  // 并行执行一组 `array` 任务，`defer` 处理最后结果
  function parallel(defer, array) {
    var end, result = [], counter = {};

    if (!isArray(array)) return defer(errorify(array, 'parallel'));
    counter.i = end = array.length - 1;
    if (end < 0) return defer(null, result);

    for (var i = 0; i <= end; i++) {
      array[i](parallelNext(defer, result, counter, i), i, array);
    }
  }

  // ##内部 **eachSeries** 函数
  // 将一组数据 `array` 分发给任务迭代函数 `iterator`，串行执行，`defer` 处理最后结果
  function eachSeries(defer, array, iterator) {
    var i = 0, end, result = [];

    function next(err, value) {
      if (!isNull(err)) return defer(err);
      result[i] = value;
      if (++i > end) return defer(null, result);
      try {
        nextTick(function () {
          iterator(next, array[i], i, array);
        });
      } catch (error) {
        defer(error);
      }
    }
    next._self = true;

    if (!isArray(array)) return defer(errorify(array, 'eachSeries'));
    end = array.length - 1;
    if (end < 0) return defer(null, result);
    iterator(next, array[i], i, array);
  }

  // ##内部 **series** 函数
  // 串行执行一组 `array` 任务，`defer` 处理最后结果
  function series(defer, array) {
    var i = 0, end, result = [];

    function next(err, value) {
      if (!isNull(err)) return defer(err);
      result[i] = value;
      if (++i > end) return defer(null, result);
      try {
        nextTick(function () {
          array[i](next, i, array);
        });
      } catch (error) {
        defer(error);
      }
    }
    next._self = true;

    if (!isArray(array)) return defer(errorify(array, 'series'));
    end = array.length - 1;
    if (end < 0) return defer(null, result);
    array[i](next, i, array);
  }

  // 封装 handler，`_self` 属性判定 handler 不是 `defer` ，不是则将 `defer` 注入成第一个参数
  function wrapTaskHandler(defer, handler) {
    return isFunction(handler) ? handler._self ? handler : bind(handler, null, defer) : null;
  }

  // ##内部 **Thenjs** 构造函数
  // 所有 **Then** 链从此继承
  function Thenjs() {}

  // 定义默认 `debug` 方法
  Thenjs.prototype.debug = typeof console === 'object' && function () {
    console.log.apply(console, arguments);
  };

  // ##内部 **Then** 构造函数
  // 由闭包生成，每一条 **Then** 链的所有 **Then** 对象继承于共同的 **Then** 构造函数
  // 不同的 **Then** 链的 **Then** 构造函数不同，但都继承于 **Thenjs** 构造函数
  function closureThen(debug) {

    // 闭包中新的 **Then** 构造函数
    function Then() {}
    // 继承于 **Thenjs** 构造函数
    var prototype = Then.prototype = new Thenjs(),
      // 闭包，保存该链上的所有 `fail` 方法，用于夸链处理 error
      fail = [],
      // 闭包，链计数器，用于 debug 模式
      chain = 0;

    // 注入 defer，执行 fn，并返回新的 **Then** 对象
    function thenFactory(fn, context) {
      var then = new Then(),
        defer = bind(then._defer, then);

      // 标记 defer，defer 作为 handler 时不会被注入 defer，见 `wrapTaskHandler`
      defer._self = then;
      // 注入 defer
      fn(defer, context);
      // 检查上一链的结果是否处理，未处理则处理，用于续接 **Then** 链
      if (context) {
        context._nextDefer = defer;
        if (context._result) context._defer.apply(context, context._result);
      }
      return then;
    }

    prototype.constructor = Then;

    // 是否开启 **debug** 模式，若开启，则将每一步的结果输入 `debug` 方法
    if (!debug || isFunction(debug)) prototype.debug = debug;

    // **Then** 对象上的 **all** 方法
    prototype.all = function (allHandler) {
      return thenFactory(function (defer, self) {
        self._all = wrapTaskHandler(defer, allHandler);
      }, this);
    };

    // **Then** 对象上的 **then** 方法
    prototype.then = function (successHandler, errorHandler) {
      return thenFactory(function (defer, self) {
        self._success = wrapTaskHandler(defer, successHandler);
        self._error = wrapTaskHandler(defer, errorHandler);
      }, this);
    };

    // **Then** 对象上的 **fail** 方法
    prototype.fail = function (errorHandler) {
      return thenFactory(function (defer, self) {
        self._fail = wrapTaskHandler(defer, errorHandler);
        // 对于链上的 fail 方法，如果无 error ，则穿透该链，将上一部结果输入下一链
        self._success = bind(defer, null, null);
        self._success._self = defer._self;
        // 将 fail 存入闭包，使得在此链之前产生的 error 也能被 fail 捕捉
        if (self._fail) fail.push(self._fail);
      }, this);
    };

    // **Then** 对象上的 **each** 方法
    prototype.each = function (array, iterator) {
      return thenFactory(function (defer, self) {
        self._each = function (dArray, dIterator) {
          // 优先使用定义的参数，如果没有定义参数，则从上一链结果从获取
          // `dArray`, `dIterator` 来自于上一链的 **defer**
          // 下同
          each(defer, array || dArray, iterator || dIterator);
        };
      }, this);
    };

    // **Then** 对象上的 **eachSeries** 方法
    prototype.eachSeries = function (array, iterator) {
      return thenFactory(function (defer, self) {
        self._eachSeries = function (dArray, dIterator) {
          eachSeries(defer, array || dArray, iterator || dIterator);
        };
      }, this);
    };

    // **Then** 对象上的 **parallel** 方法
    prototype.parallel = function (array) {
      return thenFactory(function (defer, self) {
        self._parallel = function (dArray) {
          parallel(defer, array || dArray);
        };
      }, this);
    };

    // **Then** 对象上的 **series** 方法
    prototype.series = function (array) {
      return thenFactory(function (defer, self) {
        self._series = function (dArray) {
          series(defer, array || dArray);
        };
      }, this);
    };

    // 核心 **defer** 方法
    // **defer** 收集任务结果，触发下一个链接，它被注入各个 handler，不应该直接调用
    // 其参数采用 **node.js** 的 **callback** 形式：(error, value1, value2, ...)
    prototype._defer = function (err) {
      var allHandler, errorHandler, successHandler, self = this, args = arguments;

      // then链上的结果已经处理，若重复执行 defer 则直接跳过；
      if (self._result === false) return;
      if (self._result) {
        // _result 已存在，表明上一次 defer 没有 handler 处理
        // 这是第二次进入 defer 继续处理，并标记结果已处理，这是由续接 **Then** 链触发
        self._result = false;
      } else if (self.debug) {
        // 表明这是第一次进入 defer，若存在 debug 则执行，对于同一结果保证 debug 只执行一次；
        chain += 1;
        self.debug.apply(self.debug, ['\nResult of chain ' + chain + ': '].concat(slice.call(args)));
      }

      allHandler = self._all;
      errorHandler = self._fail ? fail.shift() : self._error;
      successHandler = self._success || self._each || self._eachSeries || self._parallel || self._series;

      function execute() {
        if (allHandler) return allHandler.apply(allHandler._self, args);
        if (!isNull(err)) throw err;
        if (successHandler) {
          successHandler.apply(successHandler._self, slice.call(args, 1));
        } else {
          // 对于正确结果，**Then** 链上没有相应 handler 处理，则在 **Then** 链上保存结果，等待下一次处理。
          self._result = args;
        }
      }

      function dealError(error) {
        error.stack = error.stack || error.description;
        if (isNull(err) && self._nextDefer) {
          // 本次 defer catch的 error，直接放到下一链处理
          self._nextDefer(error);
        } else if (errorHandler || fail.length) {
          // 获取本链的 error handler 或者链上的fail handler
          errorHandler = errorHandler || fail.shift();
          errorHandler.call(errorHandler._self, error);
        } else if (isFunction(thenjs.onerror)) {
          // 如果定义了全局 **onerror**，则用它处理
          thenjs.onerror(error);
        } else {
          // 对于 error，**Then** 链上没有相应 handler 处理，则在 **Then** 链上保存结果，等待下一次处理。
          self._result = [error];
        }
      }

      try {
        execute();
      } catch (error) {
        dealError(error);
      }
    };

    return thenFactory;
  }

  // 异步执行函数，同时捕捉错误，用 `defer` 处理。
  function tryTask(defer, task) {
    nextTick(function () {
      try {
        task();
      } catch (error) {
        defer(error);
      }
    });
  }

  // 工厂函数，生成 thenjs.each 和 thenjs.eachSeries
  function eachAndSeriesFactory(fn) {
    return function (array, iterator, debug) {
      return closureThen(debug)(function (defer) {
        tryTask(defer, function () {
          return fn(defer, array, iterator);
        });
      });
    };
  }


  // 工厂函数，生成 thenjs.parallel 和 thenjs.series
  function parallelAndSeriesFactory(fn) {
    return function (array, debug) {
      return closureThen(debug)(function (defer) {
        tryTask(defer, function () {
          return fn(defer, array);
        });
      });
    };
  }

  // 对外输出的主函数
  function thenjs(startFn, debug) {
    return closureThen(debug)(function (defer) {
      tryTask(defer, function () {
        return isFunction(startFn) ? startFn(defer) : defer();
      });
    });
  }

  thenjs.constructor = Thenjs;
  thenjs.nextTick = nextTick;
  thenjs.each = eachAndSeriesFactory(each);
  thenjs.eachSeries = eachAndSeriesFactory(eachSeries);
  thenjs.parallel = parallelAndSeriesFactory(parallel);
  thenjs.series = parallelAndSeriesFactory(series);

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = thenjs;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {return thenjs;});
  } else if (typeof window === 'object') {
    window.thenjs = thenjs;
  }
}());
