'use strict'
/*global console, Thenjs, XMLHttpRequest*/

function request (url) {
  return function (callback) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.onreadystatechange = function () {
      if (this.readyState !== 4) return
      callback(this.status === 200 ? null : xhr, xhr)
    }
    xhr.send()
  }
}

Thenjs(request('http://www.w3school.com.cn/'))
  .then(function (cont, data) {
    console.log(data)
    cont(null, data.responseText)
  })
  .then(function (cont, data) {
    console.log(data)
  })
  .fail(function (cont, error) {
    console.error(error.statusText)
  })
