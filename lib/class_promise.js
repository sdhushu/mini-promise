// 自定义promise函数 模块

(function (window) {
    /*
        Promise 构造函数
        excutor 执行器函数(同步)
    */

    //  定义常量 
    const PENDING = 'pending'
    const RESOLVED = 'resolved'
    const REJECTED = 'rejected'

    class Promise {
        constructor(excutor) {
            // 将当前promise保存起来
            const _that = this
            _that.status = PENDING // 给promise对象指定status属性， 初始值为pending
            _that.data = undefined // 给promise对象指定一个用于存储结果数据的属性
            _that.callbacks = []    // 每个元素的结构 {onResolved() {}, onRejected() {}}
            function resolve(value) {
                // 如果当前状态不是pending 直接结束
                if (_that.status !== PENDING) {
                    return
                }
                // 将状态改为resolved
                _that.status = RESOLVED
                //保存value数据
                _that.data = value
                // 如果有待执行的callbacks函数， 立即异步执行回调函数
                if (_that.callbacks.length > 0) {
                    setTimeout(() => { // 放入队列中执行所有成功的回调
                        _that.callbacks.forEach(callbacksObj => {
                            callbacksObj.onResolved(value)
                        });
                    })

                }
            }

            function reject(reason) {
                // 如果当前状态不是pending 直接结束
                if (_that.status !== PENDING) {
                    return
                }
                // 将状态改为reject
                _that.status = REJECTED
                //保存value数据
                _that.data = reason
                // 如果有待执行的callbacks函数， 立即异步执行回调函数
                if (_that.callbacks.length > 0) {
                    setTimeout(() => { // 放入队列中执行所有失败的回调
                        _that.callbacks.forEach(callbacksObj => {
                            callbacksObj.onRjected(reason)
                        });
                    })

                }
            }
            // 立即同步执行 执行器 内部调用 resolve reject
            // 如果发生异常 直接触发失败
            try {
                excutor(resolve, reject)
            } catch (error) {
                reject(error)
            }
        }

            /*
        Promise原型上的then方法 
        指定成功和失败的回调函数
        返回一个新的promise对象
     */
    then (onResolved, onRjected) {
            onResolved = typeof onResolved === 'function' ? onResolved : value => value
            // 指定默认的失败回调  实现错误、异常穿透的关键
            onRjected = typeof onRjected === 'function' ? onRjected : reason => { throw reason }
            const _that = this
            // 返回一个新的promise
            return new Promise((resolve, reject) => {

                /*
                    调用指定函数处理 根据执行的结果改变return的promise状态
                */
                function handle(callback) {
                    /*
                       1. 如果执行抛出异常，return的promise就会失败，reason就是error
                       2. 如果回调函数执行返回非promise,return的promise就会成功，value就是返回的值
                       3. 如果回调函数执行返回是promise,return的promise就是这个promise的结果
                       */
                    try {
                        const result = callback(_that.data)
                        //    3. 如果回调函数执行返回是promise,return的promise就是这个promise的结果
                        if (result instanceof Promise) {
                            // 基础语法
                            // result.then(
                            //     value =>resolve(value), // result 成功时，让return的promise也成功
                            //     reason =>reject(reason) // result 失败时，让return的promise也失败
                            // )
                            // 简洁语法
                            result.then(resolve, reject)
                        } else {
                            //    2. 如果回调函数执行返回非promise,return的promise就会成功，value就是返回的值
                            resolve(result)
                        }
                        // 1. 如果执行抛出异常，return的promise就会失败，reason就是error
                    } catch (error) {
                        reject(error)
                    }
                }
                // 当前状态是pending 将回调函数保存起来
                if (_that.status == PENDING) {
                    _that.callbacks.push({
                        onResolved(value) {
                            handle(onResolved)
                        },
                        onRjected(reason) {
                            handle(onRjected)
                        }
                    })
                } else if (_that.status = RESOLVED) { // 如果当前是resolve状态，异步执行onResolved并改变promise状态
                    setTimeout(() => {
                        handle(onResolved)
                    })
                } else { //'rejected'
                    setTimeout(() => { // 如果当前是rejected状态，异步执行onRejected并改变promise状态
                        handle(onRjected)
                    })
                }
            })
        }

    /*
        Promise原型上的catch方法 
        指定失败的回调函数
        返回一个新的promise对象
     */
    catch (onRjected) {
            return this.then(undefined, onRjected)
        }

    /*
        Promise函数对象的resolve方法
        返回一个指定value的成功promise
    */

    static resolve (value) {
            // 返回一个成功/失败的promise
            return new Promise((resolve, reject) => {
                // value是promise 使用value得结果作为promise结果
                if (value instanceof Promise) {
                    value.then(resolve, reject)
                } else {
                    // value不是promise => promise变成功 数据是value
                    resolve(value)
                }
            })
        }

    /*
    
        Promise函数对象的reject方法
        返回一个指定reason的失败promise
    */

    static reject (reason) {
            // 返回一个失败的promise
            return new Promise((resolve, reject) => {
                reject(reason)
            })
        }

    /*
        Promise函数对象的all方法
        返回一个promise，只有当所有promise都成功时，否则失败
    */

    static all (promises) {
            //用来保存所有成功value的数组 指定数组长度
            const values = new Array(promises.length)
            // 用来判断函数执行次数
            let resolvedCount = 0
            return new Promise((resolve, reject) => {
                // 遍历获取每个promise的结果
                promises.forEach((p, index) => {
                    p.then(
                        value => {
                            resolvedCount++
                            // 将成功的value加入values
                            values[index] = value
                            // 如果全部成功了，将return的promise改变成功
                            if (resolvedCount === promises.length) {
                                resolve(values)
                            }
                        },
                        reason => {
                            // 只要一个失败整个就失败
                            reject(reason)
                        }
                    )
                })
            })
        }

    /*
        Promise函数对象的race方法
        返回一个promise，结果由第一个完成的promise决定
    */

    static race (promises) {
            return new Promise((resolve, reject) => {
                promises.forEach((p, index) => {
                    p.then(
                        value => {
                            // 一旦有成功的，将return变为成功
                            resolve(value)
                        },
                        reason => {
                            // 一旦有失败的，将return变为失败
                            reject(reason)
                        }
                    )
                })
            })
        }


    }


    // 向外暴露Promise函数
    window.Promise = Promise
})(window)