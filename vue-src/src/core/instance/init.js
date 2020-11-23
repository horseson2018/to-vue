/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf' // 性能监控：window.performance
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this // 把Vue实例挂到vm上
    vm._uid = uid++ // Vue实例唯一标识

    let startTag, endTag
    /* istanbul ignore if */ // istanbul 一个代码覆盖率检测工具
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) { // config.performance = false
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed 好像通过这玩儿来判断实例是否被观察？
    vm._isVue = true
    // merge options 合并配置项
    if (options && options._isComponent) { // 组件走这里
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the 
      // internal component options needs special treatment. 
      // 译：充分利用内部组件实例化，因为动态配置项合并的过程很慢，并且内部组件的配置项都无需特殊处理
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self 译：把自己挂到自己的_self属性上
    vm._self = vm
    initLifecycle(vm) // 给vm挂上一堆诸如 _isMounted _isDestroyed 标识，把$options里面的parent挂到外面的$parent，$root在这里指向Vue实例
    initEvents(vm) // 给vm挂个_events = {}， _hasHookEvent = false
    initRender(vm) // _vnode  _staticTrees  $slots  $scopedSlots  _c  $createElement
    callHook(vm, 'beforeCreate') // 触发 beforeCreate 钩子
    initInjections(vm) // resolve injections before data/props
    initState(vm) // 这里进行数据的绑定和observe
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  console.log(options)
  // doing this because it's faster than dynamic enumeration. 译：这么做是因为这样比动态列举对象的属性来的快
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) { // 使用 Vue.extend 的情况
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
