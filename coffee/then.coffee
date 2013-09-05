# then.js, version 0.7.0, 2013/09/05
# Another very small promise!
# https://github.com/zensh/then.js
# (c) admin@zensh.com 2013
# License: MIT

slice = [].slice

thenjs = (startFn) ->
  fail = []
  nextTick = process?.nextTick ? setTimeout

  createHandler = (promise, handler) ->
    defer = promise.defer.bind(promise)
    defer._next_then = promise
    if typeof handler is 'function'
      if handler._next_then then handler else handler.bind(null, defer)

  class Promise
    all: (allHandler) ->
      promise = new Promise()
      @_all = createHandler(promise, allHandler)
      promise

    then: (successHandler, errorHandler) ->
      promise = new Promise()
      @_success = createHandler(promise, successHandler)
      @_error = createHandler(promise, errorHandler)
      promise

    fail: (errorHandler) ->
      promise = new Promise()
      @_fail = createHandler(promise, errorHandler)
      @_success = promise.defer.bind(promise, null)
      fail.push(@_fail) if @_fail
      promise

    defer: (err) ->
      @_error = if @_fail then fail.shift() else @_error
      if @_all
        @_all.apply(@_all._next_then or null, slice.call(arguments))
      else if not err?
        @_success.apply(@_success._next_then or null, slice.call(arguments, 1)) if @_success
      else if @_error or fail.length
        if @_error then @_error(err) else fail.shift()(err)
      else
        throw err

  promise = new Promise()
  defer = promise.defer.bind(promise)
  defer._next_then = promise
  nextTick(if typeof startFn is 'function' then startFn.bind(null, defer) else defer)
  promise

thenjs.each = (array, iterator, context) ->
  next = ->
    i += 1
    iterator.call(context, (if i < end then next else null), array[i], i, array)

  iterator or= ->

  if Array.isArray(array)
    i = -1
    end = array.length - 1
    next()
  else
    throw new Error "First argument #{array} is not a array!"

if typeof module isnt 'undefined' and module.exports
  module.exports = thenjs
else if typeof define is 'function'
  define(-> thenjs)
window.then = thenjs if typeof window is 'object'

return thenjs