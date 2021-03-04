## 如何让vue的watch返回变化的具体对象和属性
遇到的业务场景是这样滴，有一个视频<video>，现要求动态改变这个视频的播放地址，一开始的代码如下
```vue
<video
  ref="video"
  controls
  controlsList="nodownload"
>
  <source :src="form.showMediaUrl" type="video/mp4">
  <span class="nodataText">您的浏览器不支持Video标签。</span>
</video>
```
把video的资源地址直接绑定在了source的src上面，结果发现修改这个值之后，视频的资源并不会发生变化，百度了一下，给出了这样的解决方法
```javascript
  this.$refs.video.src = '新的播放地址'
```
当只有一个视频的时候，我们可以通过直接watch form 来触发上面这个方法(因为实际业务中涉及到跨组件，实在是懒得写$emit什么的，而且还要命名，命名这种事情懂得都懂)
```vue
'form.showFileUrl': {
  handler(v) {
    this.$nextTick(() => {
      this.$refs.video.src = v
    })
  }
}
```
事情到这里就解决了，但是转念一想，如果是要修改一堆视频中的某个视频播放地址怎么办呢，还能用watch吗？官方文档上写的[watch](https://cn.vuejs.org/v2/api/#watch)只有两个参数，一个新值，一个旧值，
而这里发生改变的是数组中的某个对象的某个属性，所以我希望发生改变的时候，不光要拿到新旧值，我还要发生改变的具体是哪个对象的哪个属性，所以去源码中看一下watch的相关部分看看有没有机会给他改上一改。
众所周知Vue监听数据变化都是在[defineReactive](https://github.com/horseson2018/to-vue/blob/master/vue-src/src/core/observer/index.js#L152)这里面实现的，所以直奔这里
```javascript
export function defineReactive (
  // ...一堆参数
) {
  // ...一堆代码
  // 为属性加入getter/setter方法
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // ... get方法
    },
    set: function reactiveSetter (newVal) {
      // ... 这里最底下值发生改变时触发notify，在这里我们直接将上面的被监听的对象obj和被监听的属性key带到参数返回
      dep.notify(key, obj)
    }
  })
}
```
dep的[notify方法](https://github.com/horseson2018/to-vue/blob/master/vue-src/src/core/observer/dep.js#L37)
```javascript
notify (v, obj) {
  // ...接收key和obj接着往下传递
  for (let i = 0, l = subs.length; i < l; i++) {
    subs[i].update(v, obj)
  }
}
```
subs是watcher的集合，所以watcher的[update方法](https://github.com/horseson2018/to-vue/blob/master/vue-src/src/core/observer/watcher.js#L167)
```javascript
notify (v, obj) {
  // ...接收key和obj接着往下传递
  for (let i = 0, l = subs.length; i < l; i++) {
    subs[i].update(v, obj)
  }
}

update (v, obj) {
  //...
  queueWatcher(this, v, obj)
}
```
再看[queueWatcher](https://github.com/horseson2018/to-vue/blob/master/vue-src/src/core/observer/scheduler.js#L164)
```javascript
export function queueWatcher (watcher: Watcher, v, obj) {
  const id = watcher.id
  if (has[id] == null) {
   ...
    if (!waiting) {
      ...
      nextTick(() => flushSchedulerQueue(v, obj))
    }
  }
}
```
完事儿~
