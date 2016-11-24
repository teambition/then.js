// **Github:** https://github.com/teambition/then.js
//
// **License:** MIT

/* global module, define, setImmediate, console */
;(function (root, factory) {
  'use strict'

  if (typeof module === 'object' && typeof module.exports === 'object') {
    /**
     * @type {{then:function}}
     */
    module.exports = factory()
  } else if (typeof define === 'function' && define.amd) {
    define([], factory)
  } else {
    root.Thenjs = factory()
  }
}(typeof window === 'object' ? window : this, function () {
  'use strict'

  var maxTickDepth = 100
  var toString = Object.prototype.toString
  var hasOwnProperty = Object.prototype.hasOwnProperty
  var nextTick = typeof setImmediate === 'function' ? setImmediate : function (fn) {
    setTimeout(fn, 0)
  }
  var isArray = Array.isArray || function (obj) {
    return toString.call(obj) === '[object Array]'
  }

  // 将 `arguments` 转成数组，效率比 `[].slice.call` 高很多
  function slice (args, start) {
    start = start || 0
    if (start >= args.length) return []
    var len = args.length
    var ret = Array(len - start)
    while (len-- > start) ret[len - start] = args[len]
    return ret
  }

  function map (array, iterator) {
    var res = []
    for (var i = 0, len = array.length; i < len; i++) res.push(iterator(array[i], i, array))
    return res
  }

  // 同步执行函数，同时捕捉异常
  function carry (errorHandler, fn) {
    try {
      fn.apply(null, slice(arguments, 2))
    } catch (error) {
      errorHandler(error)
    }
  }

  // 异步执行函数，同时捕捉异常
  function defer (errorHandler, fn) {
    var args = arguments
    nextTick(function () {
      carry.apply(null, args)
    })
  }

  function toThunk (object) {
    if (object == null) return object
    if (typeof object.toThunk === 'function') return object.toThunk()
    if (typeof object.then === 'function') {
      return function (callback) {
        object.then(function (res) {
          callback(null, res)
        }, callback)
      }
    } else return object
  }

  function arrayToTasks (array, iterator) {
    return map(array, function (value, index, list) {
      return function (done) {
        iterator(done, value, index, list)
      }
    })
  }

  // ## **Thenjs** 主函数
  function Thenjs (start, debug) {
    var self = this
    var cont
    if (start instanceof Thenjs) return start
    if (!(self instanceof Thenjs)) return new Thenjs(start, debug)
    self._chain = 0
    self._success = self._parallel = self._series = null
    self._finally = self._error = self._result = self._nextThen = null
    if (!arguments.length) return self

    cont = genContinuation(self, debug)
    start = toThunk(start)
    if (start === void 0) cont()
    else if (typeof start === 'function') defer(cont, start, cont)
    else cont(null, start)
  }

  Thenjs.defer = defer

  Thenjs.parallel = function (tasks, debug) {
    return new Thenjs(function (cont) {
      carry(cont, parallel, cont, tasks)
    }, debug)
  }

  Thenjs.series = function (tasks, debug) {
    return new Thenjs(function (cont) {
      carry(cont, series, cont, tasks)
    }, debug)
  }

  Thenjs.each = function (array, iterator, debug) {
    return new Thenjs(function (cont) {
      carry(cont, parallel, cont, arrayToTasks(array, iterator))
    }, debug)
  }

  Thenjs.eachSeries = function (array, iterator, debug) {
    return new Thenjs(function (cont) {
      carry(cont, series, cont, arrayToTasks(array, iterator))
    }, debug)
  }

  Thenjs.parallelLimit = function (tasks, limit, debug) {
    return new Thenjs(function (cont) {
      parallelLimit(cont, tasks, limit)
    }, debug)
  }

  Thenjs.eachLimit = function (array, iterator, limit, debug) {
    return new Thenjs(function (cont) {
      parallelLimit(cont, arrayToTasks(array, iterator), limit)
    }, debug)
  }

  Thenjs.nextTick = function (fn) {
    var args = slice(arguments, 1)
    nextTick(function () {
      fn.apply(null, args)
    })
  }

  // 全局 error 监听
  Thenjs.onerror = function (error) {
    console.error('Thenjs caught error: ', error)
    throw error
  }

  var proto = Thenjs.prototype
  // **Thenjs** 对象上的 **finally** 方法
  proto.fin = proto['finally'] = function (finallyHandler) {
    return thenFactory(function (cont, self) {
      self._finally = wrapTaskHandler(cont, finallyHandler)
    }, this)
  }

  // **Thenjs** 对象上的 **then** 方法
  proto.then = function (successHandler, errorHandler) {
    return thenFactory(function (cont, self) {
      if (successHandler) self._success = wrapTaskHandler(cont, successHandler)
      if (errorHandler) self._error = wrapTaskHandler(cont, errorHandler)
    }, this)
  }

  // **Thenjs** 对象上的 **fail** 方法
  proto.fail = proto['catch'] = function (errorHandler) {
    return thenFactory(function (cont, self) {
      self._error = wrapTaskHandler(cont, errorHandler)
      // 对于链上的 fail 方法，如果无 error ，则穿透该链，将结果输入下一链
      self._success = function () {
        var args = slice(arguments)
        args.unshift(null)
        cont.apply(null, args)
      }
    }, this)
  }

  // **Thenjs** 对象上的 **parallel** 方法
  proto.parallel = function (tasks) {
    return thenFactory(function (cont, self) {
      self._parallel = function (_tasks) {
        parallel(cont, tasks || _tasks)
      }
    }, this)
  }

  // **Thenjs** 对象上的 **series** 方法
  proto.series = function (tasks) {
    return thenFactory(function (cont, self) {
      self._series = function (_tasks) {
        series(cont, tasks || _tasks)
      }
    }, this)
  }

  // **Thenjs** 对象上的 **each** 方法
  proto.each = function (array, iterator) {
    return thenFactory(function (cont, self) {
      self._parallel = function (_array, _iterator) {
        // 优先使用定义的参数，如果没有定义参数，则从上一链结果从获取
        // `_array`, `_iterator` 来自于上一链的 **cont**，下同
        parallel(cont, arrayToTasks(array || _array, iterator || _iterator))
      }
    }, this)
  }

  // **Thenjs** 对象上的 **eachSeries** 方法
  proto.eachSeries = function (array, iterator) {
    return thenFactory(function (cont, self) {
      self._series = function (_array, _iterator) {
        series(cont, arrayToTasks(array || _array, iterator || _iterator))
      }
    }, this)
  }

  // **Thenjs** 对象上的 **parallelLimit** 方法
  proto.parallelLimit = function (tasks, limit) {
    return thenFactory(function (cont, self) {
      self._parallel = function (_tasks) {
        parallelLimit(cont, tasks || _tasks, limit)
      }
    }, this)
  }

  // **Thenjs** 对象上的 **eachLimit** 方法
  proto.eachLimit = function (array, iterator, limit) {
    return thenFactory(function (cont, self) {
      self._series = function (_array, _iterator) {
        parallelLimit(cont, arrayToTasks(array || _array, iterator || _iterator), limit)
      }
    }, this)
  }

  // **Thenjs** 对象上的 **toThunk** 方法
  proto.toThunk = function () {
    var self = this
    return function (callback) {
      if (self._result) {
        callback.apply(null, self._result)
        self._result = false
      } else if (self._result !== false) {
        self._finally = self._error = callback
      }
    }
  }

  // util.inspect() implementation
  proto.inspect = function () {
    var obj = {}
    for (var key in this) {
      if (!hasOwnProperty.call(this, key)) continue
      obj[key] = key === '_nextThen' ? (this[key] && this[key]._chain) : this[key]
    }
    return obj
  }

  // 核心 **continuation** 方法
  // **continuation** 收集任务结果，触发下一个链，它被注入各个 handler
  // 其参数采用 **node.js** 的 **callback** 形式：(error, arg1, arg2, ...)
  function continuation () {
    var self = this
    var args = slice(arguments)

    // then链上的结果已经处理，若重复执行 cont 则直接跳过；
    if (self._result === false) return
    // 第一次进入 continuation，若为 debug 模式则执行，对于同一结果保证 debug 只执行一次；
    if (!self._result && self._chain) {
      self.debug.apply(self, ['\nChain ' + self._chain + ': '].concat(slice(args)))
    }
    // 标记已进入 continuation 处理
    self._result = false

    carry(function (err) {
      if (err === args[0]) continuationError(self, err)
      else continuation.call(self._nextThen, err)
    }, continuationExec, self, args)
  }

  function continuationExec (ctx, args) {
    if (args[0] == null) args[0] = null
    else {
      args = [args[0]]
      if (!ctx._finally) throw args[0]
    }
    if (ctx._finally) return ctx._finally.apply(null, args)
    var success = ctx._success || ctx._parallel || ctx._series
    if (success) return success.apply(null, slice(args, 1))
    // 对于正确结果，**Thenjs** 链上没有相应 handler 处理，则在 **Thenjs** 链上保存结果，等待下一次处理。
    ctx._result = args
  }

  function continuationError (ctx, err) {
    var _nextThen = ctx
    var errorHandler = ctx._error || ctx._finally

    // 获取后链的 error handler
    while (!errorHandler && _nextThen._nextThen) {
      _nextThen = _nextThen._nextThen
      errorHandler = _nextThen._error || _nextThen._finally
    }

    if (errorHandler) {
      return carry(function (_err) {
        // errorHandler 存在则 _nextThen._nextThen 必然存在
        continuation.call(_nextThen._nextThen, _err)
      }, errorHandler, err)
    }
    // 如果定义了全局 **onerror**，则用它处理
    if (Thenjs.onerror) return Thenjs.onerror(err)
    // 对于 error，如果没有任何 handler 处理，则保存到链上最后一个 **Thenjs** 对象，等待下一次处理。
    while (_nextThen._nextThen) _nextThen = _nextThen._nextThen
    _nextThen._result = [err]
  }

  function genContinuation (ctx, debug) {
    function cont () {
      return continuation.apply(ctx, arguments)
    }
    // 标记 cont，cont 作为 handler 时不会被注入 cont，见 `wrapTaskHandler`
    cont._isCont = true
    // 设置并开启 debug 模式
    if (debug) {
      proto.debug = typeof debug === 'function' ? debug : defaultDebug
      ctx._chain = 1
    }
    return cont
  }

  // 注入 cont，执行 fn，并返回新的 **Thenjs** 对象
  function thenFactory (fn, ctx, debug) {
    var nextThen = new Thenjs()
    var cont = genContinuation(nextThen, debug)

    // 注入 cont，初始化 handler
    fn(cont, ctx)
    if (!ctx) return nextThen
    ctx._nextThen = nextThen
    if (ctx._chain) nextThen._chain = ctx._chain + 1
    // 检查上一链的结果是否处理，未处理则处理，用于续接 **Thenjs** 链
    if (ctx._result) {
      nextTick(function () {
        continuation.apply(ctx, ctx._result)
      })
    }
    return nextThen
  }

  // 封装 handler，`_isCont` 判定 handler 是不是 `cont` ，不是则将 `cont` 注入成第一个参数
  function wrapTaskHandler (cont, handler) {
    return handler._isCont ? handler : function () {
      var args = slice(arguments)
      args.unshift(cont)
      handler.apply(null, args)
    }
  }

  // ## **parallel** 函数
  // 并行执行一组 `task` 任务，`cont` 处理最后结果
  function parallel (cont, tasks) {
    if (!isArray(tasks)) return cont(errorify(tasks, 'parallel'))
    var pending = tasks.length
    var result = []

    if (pending <= 0) return cont(null, result)
    for (var i = 0, len = pending; i < len; i++) tasks[i](genNext(i))

    function genNext (index) {
      function next (error, value) {
        if (pending <= 0) return
        if (error != null) {
          pending = 0
          cont(error)
        } else {
          result[index] = value
          return !--pending && cont(null, result)
        }
      }
      next._isCont = true
      return next
    }
  }

  // ## **series** 函数
  // 串行执行一组 `array` 任务，`cont` 处理最后结果
  function series (cont, tasks) {
    if (!isArray(tasks)) return cont(errorify(tasks, 'series'))
    var i = 0
    var end = tasks.length - 1
    var run
    var result = []
    var stack = maxTickDepth

    if (end < 0) return cont(null, result)
    next._isCont = true
    tasks[0](next)

    function next (error, value) {
      if (error != null) return cont(error)
      result[i] = value
      if (++i > end) return cont(null, result)
      // 先同步执行，嵌套达到 maxTickDepth 时转成一次异步执行
      run = --stack > 0 ? carry : (stack = maxTickDepth, defer)
      run(cont, tasks[i], next)
    }
  }

  function parallelLimit (cont, tasks, limit) {
    var index = 0
    var pending = 0
    var len = tasks.length
    var queue = []
    var finished = false

    limit = limit >= 1 ? Math.floor(limit) : Number.MAX_VALUE
    // eslint-disable-next-line
    do { checkNext() } while (index < len && pending < limit)

    function checkNext () {
      if (finished) return
      if (index >= len) {
        finished = true
        return parallel(cont, queue)
      }
      if (pending >= limit) return
      pending++
      queue.push(evalTask())
    }

    function evalTask () {
      return new Thenjs(tasks[index++]).fin(function (next, err, res) {
        if (err != null) {
          finished = true
          return cont(err)
        }
        pending--
        checkNext()
        next(null, res)
      }).toThunk()
    }
  }

  // 默认的 `debug` 方法
  function defaultDebug () {
    console.log.apply(console, arguments)
  }

  // 参数不合法时生成相应的错误
  function errorify (obj, method) {
    return new Error('The argument ' + (obj && obj.toString()) + ' in "' + method + '" is not Array!')
  }

  Thenjs.NAME = 'Thenjs'
  Thenjs.VERSION = '2.0.3'
  return Thenjs
}))
