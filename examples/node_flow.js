'use strict'
/* global console */

var Thenjs = require('../then.js')
var fs = require('fs')

function fileStats (path) {
  return function (callback) {
    fs.stat(path, callback)
  }
}

Thenjs
  .each(['demo.js', '../then.min.js', '../.gitignore'], function (cont, path) {
    console.log(111111, cont, path)
    fileStats(path)(cont)
  })
  .then(function (cont, result) {
    console.log('Success: ', result)
    fileStats('none.js')(cont)
  })
  .fail(function (cont, error) {
    console.error('A file path error: ', error)
  })
