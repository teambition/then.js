then.js
====
Another very small promise!

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

then.js只有`then`对象，它包括`then`、`all`和`fail`三个方法和触发器`defer`，无需封装，直接将异步任务写入then()！因为`then`、`all`和`fail`都能自动生成下一个then对象，`reject`和`resolve`被合并为`defer`并注入任务函数，`reject`和`resolve`合并为`defer`的好处是，简化代码，还可以直接代替callback！

### then.js使用模式

**直链：**

    then(function (defer) {
        // ....
        defer(err, ...);
    }).then(function (defer, value) {
        // ....
        defer(err, ...);
    }, function (defer, err) {
        // ....
        defer(err, ...);
    }).then(function (defer) {
        // ....
        defer(err, ...);
    }).all(function (defer, err, value) {
        // ....
        defer(err, ...);
    }).then(function (defer) {
        // ....
        defer(err, ...);
    }).fail(function (defer, err) {
        // ....
    });


**嵌套：**

    then(function (defer) {
        // ....
        defer(err, ...);
    }).then(function (defer, value) {
        //第二层
        then(function (defer2) {
            // ....
            defer2(err, ...);
        }).then(function (defer2, value) {
            //第三层
            then(function (defer3) {
                // ....
            }).all(defer2); // 返回二层
        }).then(function (defer2) {
            // ....
            defer(err, ...); // 返回一层
        }).fail(defer); // 返回一层
    }).then(function (defer) {
        // ....
        defer(err, ...);
    }).fail(function (defer, err) {
        // ....
    });


**async 嵌套：**

    then(function (defer) {
        // ....
        defer(err, array);
    }).then(function (defer, array) {
        then.each(array, function (next, value) {
            // ....逐步执行同步或异步任务
            return next ? next() : defer();
        });
    }).then(function (defer) {
        // ....
        defer(err, ...);
    }).fail(function (defer, err) {
        // ....
    });

**then对象取代callback：**

    function getFileAsync() {
        return then(function (defer) {
            readFile(failname, defer);
        }).then(function (defer, fileContent) {
            // 处理fileContent
            defer(null, result);
        }).fail(function (defer, err) {
            // 处理error
            defer(err);
        });
    }

    getFileAsync().then(function (defer, file) {
        // ....
    }).fail(function(defer, err) {
        // ....
    });


更多请参考[jsGen](https://github.com/zensh/jsgen)源代码！



### Who Used

 + AngularJS中文社区：[http://angularjs.cn/]()


### API

#### promise模式：

1. 入口函数then()：

        var thenObj = then(function(defer) {
            // 执行同步或异步任务
            defer(err, result1, ...);
        })
        // 入口函数返回then对象

2. then对象的then方法：

        thenObj.then(function(defer, successResult, ...) {
            // Success Handler
            // 执行同步或异步任务
            defer(err, result1, ...);
        }, function(defer, successResult, ...) {
            // Error Handler，可选
            // 执行同步或异步任务
            defer(err, result1, ...);
        })
        // then方法返回新的then对象（即下一个then链）

3. then对象的all方法：

        thenObj.all(function(defer, err, successResult, ...) {
            // All Handler
            // 执行同步或异步任务
            defer(err, result1, ...);
        })
        // all方法返回新的then对象（即下一个then链）

4. then对象的fail方法：

        thenObj.fail(function(defer, err) {
            // Error Handler
            // 执行同步或异步任务
            defer(err, result1, ...);
        })
        // fail方法返回新的then对象（即下一个then链）

5. 关于Error收集器

    then对象的then方法的errorHandler函数、all方法、fail方法均能收集error。其中then方法的errorHandler函数和all方法只能收集上一个then对象产生的error；fail方法则能收集再它之前所有then链产生的error。

6. 关于触发器`defer`

    then.js中最关键的就是`defer`，用于触发下一个then链。从上面可知，入口函数、then方法、all方法、fail方法中的任务函数的第一个参数都被注入了defer方法，如果任务函数本身是一个defer方法，则不会再被注入defer方法。

    defer的第一个参数永远是error，如果error存在，则error下一个then对象的Error收集器，如果Error收集器不存在，则抛出error。

    如果异步任务的callback的第一个参数为error，即callback(error, result1, ...)的形式，则可直接用defer代替异步任务的callback。Node.js中的异步函数基本都是这种形式，then.js用起来超方便。

7. 关于fail方法

    `fail`方法能捕捉在它之前的then链中的任何一个error。fail的优先级低于then方法的errorHandler和all方法，即then对象不存在then方法的errorHandler和all方法时error才会进入fail。当then链的某个then对象产生了error时，如果该then对象的下一个then对象存在Error收集器，则error进入该Error收集器，否则error会直接进入then链下游最近的fail方法，其间的then对象均会跳过。

#### async模式:

    then.each(array, function (next, value, index, array) {
        // 逐步执行同步或异步任务
        asyncTask(value, function () {
            return next ? next() : callback();
        })
    });

### Install

**Node.js:**

    npm install thenjs

    var then = require('thenjs');

**Browser:**

    <script src="/pathTo/then.js"></script>

**注意：then.js需要bind方法和Array.isArray方法支持，IE8及以下请先加载es5-shim.js**


### Examples

**参见demo——test.js**

