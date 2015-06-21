'use strict'

var gulp = require('gulp')
var mocha = require('gulp-mocha')

gulp.task('test', function (done) {
  return gulp.src('test/index.js')
    .pipe(mocha({timeout: 10000}))
})

gulp.task('default', ['test'])
