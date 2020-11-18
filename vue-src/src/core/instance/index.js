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
  this._init(options) // this._init is from 'initMixin'
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
