'use strict'
/* global describe, it, Promise, noneFn1, noneFn2 */

var assert = require('assert')
var Then = require('../then')
var thunk = require('thunks')()
var x = {}

Then.onerror = null

describe('Thenjs', function () {
  describe('new Class', function () {
    it('Then()', function (done) {
      Then()
        .then(function (cont, res) {
          assert.strictEqual(res, undefined)
          done()
        })
    })

    it('Then(null)', function (done) {
      Then(null)
        .then(function (cont, res) {
          assert.strictEqual(res, null)
          done()
        })
    })

    it('Then(x)', function (done) {
      Then(x)
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          done()
        })
    })

    it('new Then(then)', function (done) {
      new Then(Then(x))
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          done()
        })
    })

    it('Then(thunk)', function (done) {
      Then(thunk(x))
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          done()
        })
    })

    it('Then(resolvedPromise)', function (done) {
      if (typeof Promise !== 'function') return done()
      Then(Promise.resolve(x))
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          done()
        })
    })

    it('Then(rejectedPromise)', function (done) {
      if (typeof Promise !== 'function') return done()
      Then(Promise.reject(x))
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err, x)
          done()
        })
    })

    it('Then(resolvedThen)', function (done) {
      Then(function (cont) {
        cont(null, 1, 2, 3)
      })
        .then(function (cont, res) {
          assert.strictEqual(res, 1)
          assert.strictEqual(arguments[2], 2)
          assert.strictEqual(arguments[3], 3)
          done()
        })
    })

    it('Then(rejectedThen)', function (done) {
      Then(function (cont) {
        cont(x, 1, 2, 3)
      })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err, x)
          done()
        })
    })

    it('Then(fn) throw error', function (done) {
      Then(function (cont) {
        noneFn1()
      })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          done()
        })
    })
  })

  describe('prototype', function () {
    it('.toThunk', function (done) {
      Then(x).toThunk()(function (err, res) {
        assert.strictEqual(err, null)
        assert.strictEqual(res, x)

        Then(function (cont) {
          noneFn1()
        }).toThunk()(function (err, res) {
          assert.strictEqual(err instanceof Error, true)
          done()
        })
      })
    })

    it('.then and debug options', function (done) {
      var chains = []

      Then(x, function () {
        chains.push(this._chain)
      })
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          cont(new Error('error 1'))
        }, function (cont, err) {
          assert.strictEqual('It will not run', true)
        })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message, 'error 1')
          cont(new Error('error 2'))
        })
        .then(null, function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message, 'error 2')
          cont(null, x)
        })
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          noneFn1()
        }, function (cont, err) {
          assert.strictEqual('It will not run', true)
        })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          noneFn2()
        })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn2') >= 0, true)
          cont(null, x)
        })
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          assert.deepEqual(chains, [1, 2, 3, 4, 5, 6, 7])
          cont()
        }).toThunk()(done)
    })

    it('.fin and debug options', function (done) {
      var chains = []

      Then(x, function () {
        chains.push(this._chain)
      })
        .fin(function (cont, err, res) {
          assert.strictEqual(err, null)
          assert.strictEqual(res, x)
          cont(new Error('error 1'), x)
        })
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message, 'error 1')
          assert.strictEqual(res, undefined)
          noneFn1()
        })
        .then(function (cont) {
          assert.strictEqual('It will not run', true)
        })
        .then(function (cont) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          noneFn2()
        })
        .then(function (cont) {
          assert.strictEqual('It will not run', true)
        })
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn2') >= 0, true)
          cont(null, x)
        })
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          Then(x)
            .fin(function (cont2, err, res) {
              assert.strictEqual(err, null)
              assert.strictEqual(res, x)
              cont2(new Error('error 2'))
            })
            .fin(cont)
        })
        .then(function (cont) {
          assert.strictEqual('It will not run', true)
        }, function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message, 'error 2')
          Then()
            .fin(function (cont2) {
              cont2(null, 1, 2, 3)
            })
            .fin(cont)
        })
        .then(function (cont) {
          assert.strictEqual(arguments[1], 1)
          assert.strictEqual(arguments[2], 2)
          assert.strictEqual(arguments[3], 3)
          assert.deepEqual(chains, [1, 2, 3, 5, 7, 8, 9])
          cont()
        }).toThunk()(done)
    })

    it('.fail and debug options', function (done) {
      var chains = []

      Then(x, function () {
        chains.push(this._chain)
      })
        .fail(function (cont, err) {
          assert.strictEqual('It will not run', true)
        })
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          cont(new Error('error 1'))
        })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        })
        .fail(function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message, 'error 1')
          noneFn1()
        })
        .fail(function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          noneFn2()
        })
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn2') >= 0, true)
          Then()
            .then(function (cont2) {
              noneFn1()
            })
            .fail(cont)
        })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        })
        .fail(function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.deepEqual(chains, [1, 2, 3, 6, 7, 8])
          cont()
        }).toThunk()(done)
    })

    it('.parallel', function (done) {
      var pending = []
      Then()
        .parallel([
          function (cont) {
            pending.push(1)
            assert.strictEqual(pending.length, 1)
            cont(null, 1)
          },
          function (cont) {
            assert.strictEqual(pending.length, 1)
            setTimeout(function () {
              pending.push(2)
              assert.strictEqual(pending.length, 3)
              cont(null, 2, 3)
            })
          },
          function (cont) {
            pending.push(3)
            assert.strictEqual(pending.length, 2)
            cont(null, 4)
          }
        ])
        .then(function (cont, res) {
          assert.deepEqual(pending, [1, 3, 2])
          assert.deepEqual(res, [1, 2, 4])
          cont(null, [
            function (cont) {
              setTimeout(function () {
                cont(null, x)
              })
            },
            function (cont) {
              cont(null, null)
            }
          ])
        })
        .parallel(null)
        .then(function (cont, res) {
          assert.deepEqual(res, [x, null])
          cont(null, x)
        })
        .parallel([
          function (cont) {
            cont(null, x)
          },
          function (cont) {
            noneFn1()
            cont(null, x)
          }
        ])
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        })
        .toThunk()(done)
    })

    it('.series', function (done) {
      var pending = []
      Then()
        .series([
          function (cont) {
            pending.push(1)
            assert.strictEqual(pending.length, 1)
            cont(null, 1)
          },
          function (cont) {
            assert.strictEqual(pending.length, 1)
            setTimeout(function () {
              pending.push(2)
              assert.strictEqual(pending.length, 2)
              cont(null, 2, 3)
            })
          },
          function (cont) {
            pending.push(3)
            assert.strictEqual(pending.length, 3)
            cont(null, 4)
          }
        ])
        .then(function (cont, res) {
          assert.deepEqual(pending, [1, 2, 3])
          assert.deepEqual(res, [1, 2, 4])
          cont(null, [
            function (cont) {
              setTimeout(function () {
                cont(null, x)
              })
            },
            function (cont) {
              cont(null, null)
            }
          ])
        })
        .series(null)
        .then(function (cont, res) {
          assert.deepEqual(res, [x, null])
          cont(null, x)
        })
        .series([
          function (cont) {
            cont(null, x)
          },
          function (cont) {
            noneFn1()
            cont(null, x)
          }
        ])
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        }).toThunk()(done)
    })

    it('.each', function (done) {
      var pending = []
      Then()
        .each([0, 1, 2], function (cont, value, index, list) {
          assert.strictEqual(value, index)
          assert.strictEqual(list.length, 3)
          pending.push(index)
          setTimeout(function () {
            assert.strictEqual(pending.length, 3)
            cont(null, value)
          })
        })
        .then(function (cont, res) {
          assert.deepEqual(pending, [0, 1, 2])
          assert.deepEqual(res, pending)
          cont(null, [4, 5, 6])
        })
        .each(null, function (cont, value) {
          cont(null, value)
        })
        .then(function (cont, res) {
          assert.deepEqual(res, [4, 5, 6])
          cont()
        })
        .each([1, 2, 3], function (cont, value) {
          noneFn1()
        })
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        }).toThunk()(done)
    })

    it('.eachSeries', function (done) {
      var pending = []
      Then()
        .eachSeries([0, 1, 2], function (cont, value, index, list) {
          assert.strictEqual(value, index)
          assert.strictEqual(list.length, 3)
          pending.push(index)
          setTimeout(function () {
            assert.strictEqual(pending.length, index + 1)
            cont(null, value)
          })
        })
        .then(function (cont, res) {
          assert.deepEqual(pending, [0, 1, 2])
          assert.deepEqual(res, pending)
          cont(null, [4, 5, 6])
        })
        .eachSeries(null, function (cont, value) {
          cont(null, value)
        })
        .then(function (cont, res) {
          assert.deepEqual(res, [4, 5, 6])
          cont()
        })
        .eachSeries([1, 2, 3], function (cont, value) {
          noneFn1()
        })
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        }).toThunk()(done)
    })

    it('.parallelLimit', function (done) {
      var i = 0
      var limit = 50
      var current = 0
      var pending = []
      var tasks = []

      while (i < 100) tasks.push(genTask(i++))

      function genTask (index) {
        return function (callback) {
          current++
          pending.push(index)
          assert.strictEqual(current <= limit, true)
          setTimeout(function () {
            current--
            callback(null, index)
          }, 20)
        }
      }

      Then()
        .parallelLimit(tasks, 50)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          limit = 10
          current = 0
          pending = []
          cont(null, tasks)
        })
        .parallelLimit(null, 10)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          cont()
        }).toThunk()(done)
    })

    it('.eachLimit', function (done) {
      var i = 0
      var limit = 50
      var current = 0
      var pending = []
      var array = []

      while (i < 100) array.push(i++)

      function iterator (callback, value, index, list) {
        current++
        pending.push(index)
        assert.strictEqual(value, index)
        assert.strictEqual(current <= limit, true)
        setTimeout(function () {
          current--
          callback(null, index)
        }, 20)
      }

      Then()
        .eachLimit(array, iterator, 50)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          limit = 10
          current = 0
          pending = []
          cont(null, array)
        })
        .eachLimit(null, iterator, 10)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          cont()
        }).toThunk()(done)
    })
  })

  describe('Class method', function () {
    it('Then.parallel', function (done) {
      var pending = []
      Then
        .parallel([
          function (cont) {
            pending.push(1)
            assert.strictEqual(pending.length, 1)
            cont(null, 1)
          },
          function (cont) {
            assert.strictEqual(pending.length, 1)
            setTimeout(function () {
              pending.push(2)
              assert.strictEqual(pending.length, 3)
              cont(null, 2, 3)
            })
          },
          function (cont) {
            pending.push(3)
            assert.strictEqual(pending.length, 2)
            cont(null, 4)
          }
        ])
        .then(function (cont, res) {
          assert.deepEqual(pending, [1, 3, 2])
          assert.deepEqual(res, [1, 2, 4])
          cont(null, [
            function (cont) {
              setTimeout(function () {
                cont(null, x)
              })
            },
            function (cont) {
              cont(null, null)
            }
          ])
        })
        .parallel(null)
        .then(function (cont, res) {
          assert.deepEqual(res, [x, null])
          cont(null, x)
        })
        .parallel([
          function (cont) {
            cont(null, x)
          },
          function (cont) {
            noneFn1()
            cont(null, x)
          }
        ])
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        })
        .toThunk()(done)
    })

    it('Then.series', function (done) {
      var pending = []
      Then
        .series([
          function (cont) {
            pending.push(1)
            assert.strictEqual(pending.length, 1)
            cont(null, 1)
          },
          function (cont) {
            assert.strictEqual(pending.length, 1)
            setTimeout(function () {
              pending.push(2)
              assert.strictEqual(pending.length, 2)
              cont(null, 2, 3)
            })
          },
          function (cont) {
            pending.push(3)
            assert.strictEqual(pending.length, 3)
            cont(null, 4)
          }
        ])
        .then(function (cont, res) {
          assert.deepEqual(pending, [1, 2, 3])
          assert.deepEqual(res, [1, 2, 4])
          cont(null, [
            function (cont) {
              setTimeout(function () {
                cont(null, x)
              })
            },
            function (cont) {
              cont(null, null)
            }
          ])
        })
        .series(null)
        .then(function (cont, res) {
          assert.deepEqual(res, [x, null])
          cont(null, x)
        })
        .series([
          function (cont) {
            cont(null, x)
          },
          function (cont) {
            noneFn1()
            cont(null, x)
          }
        ])
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        }).toThunk()(done)
    })

    it('Then.each', function (done) {
      var pending = []
      Then
        .each([0, 1, 2], function (cont, value, index, list) {
          assert.strictEqual(value, index)
          assert.strictEqual(list.length, 3)
          pending.push(index)
          setTimeout(function () {
            assert.strictEqual(pending.length, 3)
            cont(null, value)
          })
        })
        .then(function (cont, res) {
          assert.deepEqual(pending, [0, 1, 2])
          assert.deepEqual(res, pending)
          cont(null, [4, 5, 6])
        })
        .each(null, function (cont, value) {
          cont(null, value)
        })
        .then(function (cont, res) {
          assert.deepEqual(res, [4, 5, 6])
          cont()
        })
        .each([1, 2, 3], function (cont, value) {
          noneFn1()
        })
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        }).toThunk()(done)
    })

    it('Then.eachSeries', function (done) {
      var pending = []
      Then
        .eachSeries([0, 1, 2], function (cont, value, index, list) {
          assert.strictEqual(value, index)
          assert.strictEqual(list.length, 3)
          pending.push(index)
          setTimeout(function () {
            assert.strictEqual(pending.length, index + 1)
            cont(null, value)
          })
        })
        .then(function (cont, res) {
          assert.deepEqual(pending, [0, 1, 2])
          assert.deepEqual(res, pending)
          cont(null, [4, 5, 6])
        })
        .eachSeries(null, function (cont, value) {
          cont(null, value)
        })
        .then(function (cont, res) {
          assert.deepEqual(res, [4, 5, 6])
          cont()
        })
        .eachSeries([1, 2, 3], function (cont, value) {
          noneFn1()
        })
        .fin(function (cont, err, res) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          assert.strictEqual(res, void 0)
          cont()
        }).toThunk()(done)
    })

    it('Then.parallelLimit', function (done) {
      var i = 0
      var limit = 50
      var current = 0
      var pending = []
      var tasks = []

      while (i < 100) tasks.push(genTask(i++))

      function genTask (index) {
        return function (callback) {
          current++
          pending.push(index)
          assert.strictEqual(current <= limit, true)
          setTimeout(function () {
            current--
            callback(null, index)
          }, 20)
        }
      }

      Then
        .parallelLimit(tasks, 50)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          limit = 10
          current = 0
          pending = []
          cont(null, tasks)
        })
        .parallelLimit(null, 10)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          cont()
        }).toThunk()(done)
    })

    it('Then.eachLimit', function (done) {
      var i = 0
      var limit = 50
      var current = 0
      var pending = []
      var array = []

      while (i < 100) array.push(i++)

      function iterator (callback, value, index, list) {
        current++
        pending.push(index)
        assert.strictEqual(value, index)
        assert.strictEqual(current <= limit, true)
        setTimeout(function () {
          current--
          callback(null, index)
        }, 20)
      }

      Then
        .eachLimit(array, iterator, 50)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          limit = 10
          current = 0
          pending = []
          cont(null, array)
        })
        .eachLimit(null, iterator, 10)
        .then(function (cont, res) {
          assert.deepEqual(res, pending)
          cont()
        }).toThunk()(done)
    })

    it('Then.onerror', function (done) {
      Then.onerror = function (err) {
        assert.strictEqual(err instanceof Error, true)
        assert.strictEqual(err.message.indexOf('noneFn2') >= 0, true)
        done()
      }

      Then(function () {
        noneFn1()
      })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        })
        .fin(function (cont, err) {
          assert.strictEqual(err instanceof Error, true)
          assert.strictEqual(err.message.indexOf('noneFn1') >= 0, true)
          cont(null, x)
        })
        .then(function (cont, res) {
          assert.strictEqual(res, x)
          noneFn2()
        })
        .then(function (cont, res) {
          assert.strictEqual('It will not run', true)
        })
    })
  })
})
