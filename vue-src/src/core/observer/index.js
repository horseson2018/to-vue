/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * Observe构造函数做了三件事：
 * 1.为对象添加__ob__属性，__ob__中包含value数据对象本身、dep依赖收集器、vmCount
 * 2.若对象是array类型，则进行array类型操作
 * 3.若对象是object类型，则进行object类型操作
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    // 依赖收集器
    this.dep = new Dep()
    this.vmCount = 0
    // 把 Observer实例 挂到 要观察的对象的__ob__ 上
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      // 用 arrayMethods 拦截数组的原生方法
      if (hasProto) { // 判断浏览器是否支持__proto__，IE9 IE10不支持
        protoAugment(value, arrayMethods) // 支持就用 arrayMethods 替换__proto__ 
      } else {
        copyAugment(value, arrayMethods, arrayKeys) // 否则用 defineProperty 把修改后的数组方法替换进数组对象里
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历所有属性并将其转换为 getter / setter。此方法只应在值类型是对象时调用
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 * 通过拦截原型链使用 __proto__ 来扩展 Object和Array
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 * def 方法中通过设置属性 enumerable 不可枚举来隐藏该属性
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 给一个值添加观察者实例，如果成功被观察则返回一个新的观察者实例，或者返回它已经拥有的观察者实例
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) { // value必须得是object，不能是VNode实例
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) { // 已经被观察
    ob = value.__ob__
  } else if (
    shouldObserve && // 默认shouldObserve为true
    !isServerRendering() && // 不是服务端渲染
    (Array.isArray(value) || isPlainObject(value)) && // 是数组或对象
    Object.isExtensible(value) && // 可扩展（Object.preventExtensions，Object.seal 或 Object.freeze 方法都可以标记一个对象为不可扩展（non-extensible））
    !value._isVue // 不是vue组件
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 对一个Object 定义一个响应式的属性
 * defineReactive方法主要做了以下几件事：
 * 1.为每个属性实例化一个dep依赖收集器，用于收集该属性的相关依赖。【通过getter、setter引用】
 * 2.缓存属性原有的get和set方法，保证后面重写get、set方法时行为正常。
 * 3.为每个属性创建childOb。（其实是一个对属性进行进行observe递归的过程，并将结果保存在childOb中。对象或数组属性的childOb为__ob__，其他属性的childOb为undefined）。【通过getter、setter引用】
 * 4.将对象中的每一个属性都加上getter、setter方法。
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // dep存储依赖的变量，每个属性字段都有一个属于自己的dep，用于收集属于该字段的依赖
  const dep = new Dep()
  /**
   * getOwnPropertyDescriptor
   * 返回指定对象上一个自有属性对应的属性描述符
   */
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 为每个属性创建childOb，并且对每个属性进行observe递归
  let childOb = !shallow && observe(val)
  // 为属性加入getter/setter方法
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 调用原属性的get方法返回值
      const value = getter ? getter.call(obj) : val
      // 如果存在需要被收集的依赖
      if (Dep.target) {
        // 将依赖收集到dep中
        dep.depend()
        if (childOb) {
          // 每个对象的 __ob__.dep 也收集该依赖
          childOb.dep.depend()
          if (Array.isArray(value)) {
            // 如果属性是array类型，进行dependArray操作
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${target}`)
  }
  // 数组
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 对象切拥有key属性
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  // 当target是对象，没有key属性的时候
  const ob = target.__ob__
  if (target._isVue || (ob && ob.vmCount)) { // target是vue组件
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 当target是对象，没有key属性，没有__ob__
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
