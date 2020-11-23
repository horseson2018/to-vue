import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'


// 构造函数
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue)) { // 不是new 出来的vue 浏览器会抛出警告
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue) // 提供_init方法
stateMixin(Vue) // $data $props $set $delete $watch
eventsMixin(Vue) // $on $once $off $emit
lifecycleMixin(Vue) // _update $forceUpdate $destroy
renderMixin(Vue) // $nextTick _render

export default Vue
