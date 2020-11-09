/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */
/**
 * 通过Object.defineProperty()劫持数组为其设置getter和setter后，
 * 调用的数组的push、splice、pop等方法改变数组元素时并不会触发数组的setter，
 * 这就会造成使用上述方法改变数组后，页面上并不能及时体现这些变化，也就是数组数据变化不是响应式的
 * 所以这里vue重写了数组的'push', 'pop', 'shift'等方法
 * 事实上，Object.defineProperty 本身是可以监控到数组下标的变化的，只是在 Vue 的实现中，从性能/体验的性价比考虑，放弃了这个特性
 * 参考文档：https://juejin.im/post/6844903965180575751?utm_medium=hao.caibaojian.com&utm_source=hao.caibaojian.com
*/
import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    const result = original.apply(this, args)
    const ob = this.__ob__
    let inserted
    // 数组 Object.defineProperty 监听的是下标索引变化，所以这里只有以下三种方法会新增索引
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      // 针对splice方法：例：array.splice(2, 0, "three"); 
      // 这里args为'2'（添加/删除项目的位置）,'0'(删除的项目数量),'three'(插入的内容)
      // 所以用slice(2)取下标为2和2之后所有插入的内容进行observe
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // push，unshift，splice三个方法触发后，在这里手动observe，其他方法的变更会在当前的索引上进行更新，所以不需要再执行ob.observeArray
    if (inserted) ob.observeArray(inserted)
    // notify change 通过执行ob.dep.notify()将当前数组的变更通知给其订阅者，这样当使用重写后方法改变数组后，数组订阅者会将这边变化更新到页面中
    ob.dep.notify()
    return result
  })
})
