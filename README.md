then.js
====

The smallest promise!

仅40行代码的promise函数，能将任何异步回调函数转换成then()链式调用！

### Who Used

 + AngularJS中文社区：[http://angularjs.cn/]()

### Examples

    function asnycTask(n, callback) {
        setTimeout(function () {
            callback(null, n);
        }, n * 1000);
    }

    then(function (defer) {
        console.log(111);
        asnycTask(1, defer);
    }).
    then(function (defer, a) {
        console.log(222, a);
        asnycTask(2, defer);
    }).
    then(function (defer, a) {
        console.log(333, a);
        asnycTask(3, function (err, b) {
            console.log(3332, err, b);
            defer(null, 'hello!', b);
        });
    }).
    then(function (defer, a, b) {
        console.log(444, a, b);
        defer('Error!');
    }).
    then(null, function (defer, err) {
        console.log(555, err);
    });
