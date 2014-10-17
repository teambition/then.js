'use strict';
/*global console*/

var Thenjs = require('../then.js');

Thenjs(function (cont) {
  cont(null, [
    function (cont, index) {
      console.log(index, 'val1');
      cont();
    },
    function (cont, index) {
      console.log(index, 'val2');
      cont();
    },
  ]);
})
.series()
.then(function () {
  console.log('series1 end');
});

Thenjs(function (cont) {
  Thenjs.series([
    function (cont2, index) {
      console.log(index, 'val1');
      cont2();
    },
    function (cont2, index) {
      console.log(index, 'val2');
      cont2();
    },
  ]).fin(cont);
})
.then(function () {
  console.log('series2 end');
});

Thenjs(function (cont) {
  cont(null, ['a', 'b', 'c']);
})
.eachSeries(null, function (cont, value, index) {
  console.log(value, index);
  cont();
})
.then(function () {
  console.log('eachSeries end');
});
