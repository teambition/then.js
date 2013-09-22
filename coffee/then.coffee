# then.js, version 0.9.2, 2013/09/22
# Another very small asynchronous promise tool!
# https://github.com/teambition/then.js, admin@zensh.com
# License: MIT

slice = [].slice
isArray = Array.isArray
noop = ->

isFunction = (fn) ->
  typeof fn is 'function'

nextTick = if typeof process is 'object' && isFunction(process.nextTick) then process.nextTick else setTimeout

getError = (obj, method, type) ->
  new Error("Argument #{obj} in \"#{method}\" function is not a #{type} !");

each = (defer, array, iterator, context) ->
  next = (index, err, result) ->
    total -= 1
    resultArray[index] = result
    defer(err or null, resultArray) if total <= 0 or err?

  resultArray = []
  next._next_then = {}
  if not isArray(array)
    defer(getError(array, 'each', 'array'))
  else if not isFunction(iterator)
    defer(getError(iterator, 'each', 'function'))
  else
    total = array.length
    if not total
      defer(null, resultArray)
    else
      iterator.call(context, next.bind(null, i), item, i, array) for item, i in array

eachSeries = (defer, array, iterator, context) ->
  next = (err, result) ->
    resultArray[i] = result
    i += 1;
    if i < end and not err?
      iterator.call(context, next, array[i], i, array)
    else
      delete resultArray[-1]
      defer(err or null, resultArray)

  i = -1
  resultArray = []
  next._next_then = {}
  if not isArray(array)
    defer(getError(array, 'eachSeries', 'array'))
  else if not isFunction(iterator)
    defer(getError(iterator, 'eachSeries', 'function'))
  else
    end = array.length
    if end then next() else defer(null, resultArray)

parallel = (defer, array, context) ->
  next = (index, err, result) ->
    total -= 1;
    resultArray[index] = result;
    defer(err or null, resultArray) if total <= 0 or err?

  resultArray = []
  next._next_then = {}
  if not isArray(array)
    defer(getError(array, 'parallel', 'array'))
  else
    total = array.length
    if total
      for fn, i in array
        if isFunction(fn)
          fn.call(context, next.bind(null, i), i)
        else
          defer(getError(fn, 'parallel', 'function'))
    else
      defer(null, resultArray)

series = (defer, array, context) ->
  next = (err, result) ->
    resultArray[i] = result
    i += 1
    if i < end and not err?
      if isFunction(array[i])
        array[i].call(context, next, i)
      else
        defer(getError(array[i], 'series', 'function'))
    else
      delete resultArray[-1]
      defer(err or null, resultArray)

  i = -1
  resultArray = []
  next._next_then = {}
  if isArray(array)
    end = array.length
    if end then next() else defer(null, resultArray)
  else
    defer(getError(array, 'series', 'array'))

tryNextTick = (defer, fn) ->
  nextTick(->
    try
      fn()
    catch error
      defer(error)
  )

createHandler = (defer, handler) ->
  if isFunction(handler)
    if handler._next_then then handler else handler.bind(null, defer)

closurePromise = (debug) ->
  fail = []
  chain = 0

  promiseFactory = (fn) ->
    promise = new Promise()
    defer = promise.defer.bind(promise)
    defer._next_then = promise
    fn(defer)
    promise

  class Promise
    debug: debug

    all: (allHandler) ->
      promiseFactory((defer) =>
        @_all = createHandler(defer, allHandler)
      )

    then: (successHandler, errorHandler) ->
      promiseFactory((defer) =>
        @_success = createHandler(defer, successHandler)
        @_error = createHandler(defer, errorHandler)
      )

    fail: (errorHandler) ->
      promiseFactory((defer) =>
        @_fail = createHandler(defer, errorHandler)
        @_success = defer.bind(defer, null)
        fail.push(@_fail) if @_fail
      )

    each: (array, iterator, context) ->
      promiseFactory((defer) =>
        @_each = (dArray, dIterator, dContext) =>
          each(defer, array or dArray, iterator or dIterator, context or dContext)
      )

    eachSeries: (array, iterator, context) ->
      promiseFactory((defer) =>
        @_eachSeries = (dArray, dIterator, dContext) =>
          eachSeries(defer, array or dArray, iterator or dIterator, context or dContext)
      )

    parallel: (array, context) ->
      promiseFactory((defer) =>
        @_parallel = (dArray, dContext) =>
          parallel(defer, array or dArray, context or dContext)
      )

    series: (array, context) ->
      promiseFactory((defer) =>
        @_series = (dArray, dContext) =>
          series(defer, array or dArray, context or dContext)
      )

    defer: (err) ->
      chain += 1;
      @_error = if @_fail then fail.shift() else @_error
      @_success = @_success or @_each or @_eachSeries or @_parallel or @_series or noop
      try
        if @debug
          args = slice.call(arguments)
          args.unshift("Then chain #{chain}:");
          if isFunction(@debug)
              @debug.apply(@debug, args)
          else if typeof console is 'object' and isFunction(console.log)
              console.log.apply(console, args)
        if @_all
            @_all.apply(@_all._next_then, slice.call(arguments))
        else if not err?
            @_success.apply(@_success._next_then, slice.call(arguments, 1))
        else throw err
      catch error
        if @_error or fail.length
          if @_error then @_error(error) else fail.shift()(error)
        else
          throw error
      finally
        @_all = noop

  return promiseFactory

eachAndSeriesFactory = (fn) ->
  return (array, iterator, context, debug) ->
    closurePromise(debug)((defer) ->
      tryNextTick(defer, fn.bind(null, defer, array, iterator, context))
    )

parallelAndSeriesFactory = (fn) ->
  return (array, context, debug) ->
    closurePromise(debug)((defer) ->
      tryNextTick(defer, fn.bind(null, defer, array, context))
    )
thenjs = (startFn, context, debug) ->
  closurePromise(debug)((defer) ->
    tryNextTick(defer, if isFunction(startFn) then startFn.bind(context, defer) else defer)
  )

thenjs.each = eachAndSeriesFactory(each)
thenjs.eachSeries = eachAndSeriesFactory(eachSeries)
thenjs.parallel = parallelAndSeriesFactory(parallel)
thenjs.series = parallelAndSeriesFactory(series)
if typeof module isnt 'undefined' and module.exports
  module.exports = thenjs
else if typeof define is 'function'
  define(-> thenjs)
window.then = thenjs if typeof window is 'object'

return thenjs