'use strict';

var gulp = require('gulp');
var clean = require('gulp-clean');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('clean', function(callback) {
  var s = gulp.src('then.min.js')
    .pipe(clean());
  return callback(null);
});

gulp.task('jshint', function(callback) {
  var s = gulp.src(['*.js', '!then.min.js'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
  return callback(null);
});

gulp.task('uglify', function(callback) {
  var s = gulp.src('then.js')
    .pipe(rename('then.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('.'));
  return callback(null);
});

// The default task (called when you run `gulp`)
gulp.task('default', function() {
  gulp.run('clean', 'jshint', 'uglify');

  // Watch files and run tasks if they change
  // gulp.watch('then.js', function(event) {
  //   gulp.run('jshint');
  // });
});
