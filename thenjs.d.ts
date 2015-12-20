interface IThenjsConstructor {
 /**
  * start: Function，function (cont) {}, 即 IThunk 函数（见下面解释），或者 Promise 对象，或者 Thenjs 对象，或者其他值。
  * debug: Boolean 或 Function，可选，开启调试模式，将每一个链的运行结果用 debug 函数处理，如果debug为非函数真值，则调用 console.log，下同
  */
  (start?: IstartFn, debug?: Boolean): IThenjsProto
  each: Ieach<any>
  eachSeries: IeachSeries<any>
  parallel: Iparallel
  series: Iseries
  parallelLimit: IparallelLimit
  eachLimit: IeachLimit<any>
  nextTick: InextTick
  defer: Idefer
  onerror: Ionerror
}

interface IThenjsProto {
  each?: Ieach<any>
  eachSeries?: IeachSeries<any>
  parallel?: Iparallel
  series?: Iseries
  parallelLimit?: IparallelLimit
  eachLimit?: IeachLimit<any>
  then(successCallback?: (cont?: IstartFn, ...results: any[]) => any, errorCallback?: (cont?: IstartFn, error?: Error) => any): IThenjsProto
  fin(finallyHandler: (cont?: IstartFn, error?: Error, ...results: any[]) => any | IstartFn): IThenjsProto
  finally(finallyHandler: (cont?: IstartFn, error?: Error, ...results: any[]) => any | IstartFn): IThenjsProto
  fail(errorHandler: (cont?: IstartFn, error?: Error) => any | IstartFn): IThenjsProto
  catch(errorHandler: (cont?: IstartFn, error?: Error) => any | IstartFn): IThenjsProto
  toIThunk(): IThunk
}

interface Ieach<T> {
  (array: T[] | IArrayLike<T>, iterator: (cont?: IstartFn, value?: T, index?: Number, array?: T[] | IArrayLike<T>) => any, debug?: Boolean): IThenjsProto
}

interface IeachSeries<T> {
  (array: T[] | IArrayLike<T>, iterator: (cont?: IstartFn, value?: T, index?: Number, array?: T[] | IArrayLike<T>) => any, debug?: Boolean): IThenjsProto
}

interface Iparallel {
  (tasksArray: ((cont: IThunk) => IThenjsProto)[], debug?: Boolean): IThenjsProto
}

interface Iseries {
  (tasksArray: IThunk[]): IThenjsProto
}

interface IparallelLimit {
  (tasksArray: IThunk[], limit: Number, debug?: Boolean): IThenjsProto
}

interface IeachLimit<T> {
  (array: T[] | IArrayLike<T>, iterator: (cont?: IstartFn, value?: T, index?: Number, array?: T[] | IArrayLike<T>) => any, limit: Number, debug?: Boolean): IThenjsProto
}

interface IstartFn {
  (...args: any[]): IThunk | IThenjsConstructor | IPromiseLike<any> | IPromise<any> | Function | any
}

interface IThunk {
  (error?: any, result?: any): any
}

interface InextTick {
  (callback: (...args: any[]) => any, ...args: any[]): any
}

interface Idefer {
  (errorHandler: (error: Error) => any, callback: (...args: any[]) => any, ...args: any[]): any
}

interface Ionerror {
  (error: Error): void
}

interface IPromiseLike<T> {
 /**
  * Attaches callbacks for the resolution and/or rejection of the Promise.
  * @param onfulfilled The callback to execute when the Promise is resolved.
  * @param onrejected The callback to execute when the Promise is rejected.
  * @returns A Promise for the completion of which ever callback is executed.
  */
  then<TResult>(onfulfilled?: (value: T) => TResult | IPromiseLike<TResult>, onrejected?: (reason: any) => TResult | IPromiseLike<TResult>): IPromiseLike<TResult>
  then<TResult>(onfulfilled?: (value: T) => TResult | IPromiseLike<TResult>, onrejected?: (reason: any) => void): IPromiseLike<TResult>
}

/**
 * Represents the completion of an asynchronous operation
 */
interface IPromise<T> {
 /**
  * Attaches callbacks for the resolution and/or rejection of the Promise.
  * @param onfulfilled The callback to execute when the Promise is resolved.
  * @param onrejected The callback to execute when the Promise is rejected.
  * @returns A Promise for the completion of which ever callback is executed.
  */
  then<TResult>(onfulfilled?: (value: T) => TResult | IPromiseLike<TResult>, onrejected?: (reason: any) => TResult | IPromiseLike<TResult>): IPromise<TResult>
  then<TResult>(onfulfilled?: (value: T) => TResult | IPromiseLike<TResult>, onrejected?: (reason: any) => void): IPromise<TResult>

  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch(onrejected?: (reason: any) => T | IPromiseLike<T>): IPromise<T>
}

interface IArrayLike<T> {
  length: number
  [n: number]: T
}

declare var Thenjs: IThenjsConstructor

export default Thenjs
