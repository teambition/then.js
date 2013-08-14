then.js
====
another very small promise!

**能用简单优美的方式将任何同步或异步回调函数转换成then()链式调用！**

then.js不同于其它promise，它没有`resolve`、也没有`reject`、更没有`promise`对象，所以你不再需要把异步任务封装成promise对象。

一个典型的promise都要封装：

    function getFile() {
        var deferred = Q.defer();

        FS.readFile("foo.txt", "utf-8", function (error, text) {
            if (error) {
                deferred.reject(new Error(error));
            } else {
                deferred.resolve(text);
            }
        });
        return deferred.promise;
    }

    getFile().then(successHandler[, errorHandler]);

若要进入下一个then链，上面then中的successHandler、errorHandler还得进行如上类似封装，搞得挺复杂！

then.js只有`then`对象，它包括`then`、`defer`和`fail`三个方法，无需封装，直接将异步任务写入then()!

**Node.js:**

    var then = require('then.js');

**Browser:**

    <script src="/pathTo/then.js"></script>


**语法：**

    then(startAsnysFn).
    then(successHandler[, errorHandler]).
    then(successHandler[, errorHandler]).
    then(successHandler[, errorHandler]).
    fail(globalErrorHandler);

**示例：**

    then(function (defer) {
        // start asnys task
        // use defer as callback function
        asnycTask1(param, defer);
    }).
    then(function (defer, value1, ...) {
        // successHandler, value1, ... from asnycTask1
        asnycTask2(value1, ..., defer);
    }, function (defer, err) {
        // errorHandler, err from asnycTask1
        console.error(err);
    }).
    then(function (defer, value) {
        // successHandler, value from asnycTask2
        asnycTask3(value, defer);
    }).
    then(function (defer, value) {
        // successHandler, value from asnycTask3
        asnycTask4(value, defer);
    }).
    fail(function (err) {
        // global errorHandler, err from asnycTask2 or asnycTask3
        console.error(err);
    });

**也可以这样用：**

    function promiseGet(param) {
        return then(function (defer) {
            asnycTask(param, defer);
        });
    }

    promiseGet(param1).then(successHandler).fail(errorHandler);


then.js中最关键的就是`defer`，then()中的函数，无论是`successHandler`还是`errorHandler`，第一个参数都是被注入的defer方法，defer的第一个参数永远是error，如果error存在，则调用下一个then中的errorHandler()或者fail()，不存在则调用下一个then中的successHandler。

如果异步任务的callback的第一个参数为error，即callback(error, result1, ...)的形式，则可直接用defer代替异步任务的callback，如上面示例所示。Node.js中的异步函数基本都是这种形式，then.js用起来超方便。

另外一个需要注意的就是`fail`，它能捕捉then链中的任何一个error，它是可选的。fail的优先级低于errorHandler，即then链定义了fail，且其中一个then定义了errorHandler，如果上一个then产生error，则error进入该errorHandler，由errorHandler决定终止还是继续；如果没有定义errorHandler，则error直接进入fail，并终止then链运行；如果fail也没有定义，则往上级抛出error。


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
    }).then(function (defer, a) {
        console.log(222, a);
        asnycTask(2, defer);
    }).then(function (defer, a) {
        console.log(333, a);
        asnycTask(3, function (err, b) {
            console.log(3332, err, b);
            defer(null, 'hello!', b);
        });
    }).then(function (defer, a, b) {
        console.log(444, a, b);
        defer('Error!');
    }).then(null, function (defer, err) {
        console.log(555, err);
    }).fail(function (err) {
        console.log(666, err);
    });
