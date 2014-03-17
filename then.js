'use strict';
/*global module, define, process, console*/

/**
 * then.js: very small asynchronous promise tool!
 * https://github.com/teambition/then.js
 * License: MIT
 */

(function () {
  var emptyThen = {},
    slice = [].slice,
    isArray = Array.isArray || function (obj) {
      // 兼容老浏览器
      return Object.prototype.toString.call(obj) === '[object Array]';
    };

  if (!Function.prototype.bind) {
    // 兼容老浏览器
    Function.prototype.bind = function (context) {
      var self = this, args = slice.call(arguments, 1);
      return function () {
        return self.apply(context, args.concat(slice.call(arguments)));
      };
    };
  }

  function isNull(obj) {
    return obj == null;
  }

  function isFunction(fn) {
    return typeof fn === 'function';
  }

  // 生成参数不合法的错误提示
  function errorify(obj, method, type) {
    return new Error('Argument ' + (obj && obj.toString()) + ' in "' + method + '" function is not a ' + type + '!');
  }

  // 将一组数据分发给任务函数，并行执行，出错或所有完成后 defer 处理
  function each(defer, array, iterator, context) {
    var i, end, total, _defer, resultArray = [];

    function next(index, err, result) {
      total -= 1;
      if (isNull(err)) {
        resultArray[index] = result;
        if (total <= 0) {
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'each', 'array'));
    } else if (!isFunction(iterator)) {
      return defer(errorify(iterator, 'each', 'function'));
    } else {
      total = end = array.length;
      if (total) {
        for (i = 0; i < end; i++) {
          _defer = next.bind(null, i);
          _defer.nextThenObject = emptyThen;
          iterator.call(context, _defer, array[i], i, array);
        }
      } else {
        return defer(null, resultArray);
      }
    }
  }

  // 将一组数据分发给任务函数，串行执行，出错或所有完成后 defer 处理
  function eachSeries(defer, array, iterator, context) {
    var end, i = -1, resultArray = [];

    function next(err, result) {
      i += 1;
      if (isNull(err)) {
        resultArray[i - 1] = result;
        if (i < end) {
          return iterator.call(context, next, array[i], i, array);
        } else {
          delete resultArray[-1];
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'eachSeries', 'array'));
    } else if (!isFunction(iterator)) {
      return defer(errorify(iterator, 'eachSeries', 'function'));
    } else {
      end = array.length;
      if (end) {
        next.nextThenObject = emptyThen;
        return next();
      } else {
        return defer(null, resultArray);
      }
    }
  }

  // 并行执行一组任务，出错或所有完成后 defer 处理
  function parallel(defer, array, context) {
    var i, end, total, _defer, resultArray = [];

    function next(index, err, result) {
      total -= 1;
      if (isNull(err)) {
        resultArray[index] = result;
        if (total <= 0) {
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'parallel', 'array'));
    } else {
      total = end = array.length;
      if (!total) {
        return defer(null, resultArray);
      } else {
        for (i = 0; i < end; i++) {
          if (isFunction(array[i])) {
            _defer = next.bind(null, i);
            _defer.nextThenObject = emptyThen;
            array[i].call(context, _defer, i);
          } else {
            return defer(errorify(array[i], 'parallel', 'function'));
          }
        }
      }
    }
  }

  // 串行执行一组任务，出错或所有完成后 defer 处理
  function series(defer, array, context) {
    var end, i = -1,
      resultArray = [];

    function next(err, result) {
      i += 1;
      if (isNull(err)) {
        resultArray[i - 1] = result;
        if (i < end) {
          if (isFunction(array[i])) {
            return array[i].call(context, next, i);
          } else {
            return defer(errorify(array[i], 'series', 'function'));
          }
        } else {
          delete resultArray[-1];
          return defer(null, resultArray);
        }
      } else {
        return defer(err);
      }
    }

    if (!isArray(array)) {
      return defer(errorify(array, 'series', 'array'));
    } else {
      end = array.length;
      if (end) {
        next.nextThenObject = emptyThen;
        return next();
      } else {
        return defer(null, resultArray);
      }
    }
  }

  function tryTask(defer, fn) {
    try {
      fn();
    } catch (error) {
      defer(error);
    }
  }

  // 封装 handler，如果 handler 不是 defer，则将 defer 注入成第一个参数
  function wrapTaskHandler(defer, handler) {
    return isFunction(handler) ? handler.nextThenObject ? handler : handler.bind(null, defer) : null;
  }

  // 带闭包的 Promise 对象
  function closurePromise(debug) {
    var fail = [],  // 保存该链上的所有 fail 方法，用于夸链处理 error
      chain = 0,  // 链计数器，用于 debug 模式
      Promise = function () {},
      prototype = Promise.prototype;

    // 执行 fn，并返回新的 promise 对象
    function promiseFactory(fn, context) {
      var promise = new Promise(),
        defer = promise.defer.bind(promise);
      defer.nextThenObject = promise;
      fn(defer, context);
      return promise;
    }

    // 检查上一链的结果是否处理，未处理则处理
    function checkDefer(context) {
      if (context._result) {
        context.defer.apply(context, context._result);
      }
    }

    // 是否开启 debug 模式，若开启，则将每一步的结果输入 debug 函数
    prototype.debug = debug && (isFunction(debug) ? debug :
      typeof console === 'object' && function () {
        console.log.apply(console, arguments);
      });

    // promise 上的 all 方法
    prototype.all = function (allHandler) {
      return promiseFactory(function (defer, self) {
        self._all = wrapTaskHandler(defer, allHandler);
        checkDefer(self);
      }, this);
    };

    // promise 上的 then 方法
    prototype.then = function (successHandler, errorHandler) {
      return promiseFactory(function (defer, self) {
        self._success = wrapTaskHandler(defer, successHandler);
        self._error = wrapTaskHandler(defer, errorHandler);
        checkDefer(self);
      }, this);
    };

    // promise 上的 fail 方法
    prototype.fail = function (errorHandler) {
      return promiseFactory(function (defer, self) {
        self._fail = wrapTaskHandler(defer, errorHandler);
        self._success = defer.bind(defer, null);
        if (self._fail) {
          fail.push(self._fail);
        }
        checkDefer(self);
      }, this);
    };

    // promise 上的 each 方法
    prototype.each = function (array, iterator, context) {
      return promiseFactory(function (defer, self) {
        self._each = function (dArray, dIterator, dContext) {
          each(defer, array || dArray, iterator || dIterator, context || dContext);
        };
        checkDefer(self);
      }, this);
    };

    // promise 上的 eachSeries 方法
    prototype.eachSeries = function (array, iterator, context) {
      return promiseFactory(function (defer, self) {
        self._eachSeries = function (dArray, dIterator, dContext) {
          eachSeries(defer, array || dArray, iterator || dIterator, context || dContext);
        };
        checkDefer(self);
      }, this);
    };

    // promise 上的 parallel 方法
    prototype.parallel = function (array, context) {
      return promiseFactory(function (defer, self) {
        self._parallel = function (dArray, dContext) {
          parallel(defer, array || dArray, context || dContext);
        };
        checkDefer(self);
      }, this);
    };

    // promise 上的 series 方法
    prototype.series = function (array, context) {
      return promiseFactory(function (defer, self) {
        self._series = function (dArray, dContext) {
          series(defer, array || dArray, context || dContext);
        };
        checkDefer(self);
      }, this);
    };

    // defer 处理结果，触发下一个链接，defer 已被注入 handler
    prototype.defer = function (err) {
      var self = this, _arguments = arguments;

      // 神逻辑～～
      if (self._result === false) {
        return;  // then链上的结果已经处理，若重复执行 defer 则直接跳过；
      } else if (self._result) {
        self._result = false;  // 第二次进入 defer，标记结果已处理
      } else if (self.debug) { // 第一次进入 defer，若存在 debug 则执行；
        var args = slice.call(_arguments);
        args.unshift('\nResult of chain ' + chain + ':');
        self.debug.apply(self.debug, args);
        chain += 1;
      }

      self._error = self._fail ? fail.shift() : self._error;
      self._success = self._success || self._each || self._eachSeries || self._parallel || self._series;

      function execute() {
        if (self._all) {
          self._all.apply(self._all.nextThenObject, slice.call(_arguments));
        } else if (isNull(err)) {
          if (self._success) {
            self._success.apply(self._success.nextThenObject, slice.call(_arguments, 1));
          } else {
            self._result = _arguments;  //then链上没有正确结果处理函数，在then链上保存结果。
          }
        } else {
          throw err;
        }
      }
      function dealError(error) {
        error.stack = error.stack || error.description;
        if (self._error || fail.length) {
          self._error = self._error || fail.shift();
          self._error.call(self._error.nextThenObject, error);
        } else if (isFunction(thenjs.onerror)) {
          thenjs.onerror(error);
        } else {
          self._result = _arguments;  //then链上没有错误结果处理函数，在then链上保存结果。
        }
      }

      try {
        execute();
      } catch (error) {
        dealError(error);
      }
    };

    return promiseFactory;
  }

  // 生成 thenjs.each 和 thenjs.eachSeries
  function eachAndSeriesFactory(fn) {
    return function (array, iterator, context, debug) {
      return closurePromise(debug)(function (defer) {
        tryTask(defer, fn.bind(null, defer, array, iterator, context));
      });
    };
  }


  // 生成 thenjs.parallel 和 thenjs.series
  function parallelAndSeriesFactory(fn) {
    return function (array, context, debug) {
      return closurePromise(debug)(function (defer) {
        tryTask(defer, fn.bind(null, defer, array, context));
      });
    };
  }

  // 主函数
  function thenjs(startFn, context, debug) {
    return closurePromise(debug)(function (defer) {
      tryTask(defer, isFunction(startFn) ? startFn.bind(context, defer) : defer);
    });
  }

  thenjs.each = eachAndSeriesFactory(each);
  thenjs.eachSeries = eachAndSeriesFactory(eachSeries);
  thenjs.parallel = parallelAndSeriesFactory(parallel);
  thenjs.series = parallelAndSeriesFactory(series);

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = thenjs;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {return thenjs;});
  } else if (typeof window === 'object') {
    window.then = thenjs;
  }
})();
