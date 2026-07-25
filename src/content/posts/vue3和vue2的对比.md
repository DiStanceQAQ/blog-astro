---
title: "Vue3和Vue2的对比"
description: "从使用的角度，不讲底层"
date: 2025-12-19
updated: 2025-12-19
category: "前端"
tags: ["Vue3"]
cover: "/images/covers/performance-lines.webp"
coverAlt: "暗色空间中的高速数据轨迹"
featured: false
draft: false
---

## 一、API 风格：Options API vs Composition API

### Vue 2：Options API（选项式 API）
```javascript
export default {
  data() {
    return {
      count: 0,
      user: { name: 'Alice' }
    }
  },
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  watch: {
    count(newVal, oldVal) {
      console.log(`count变化: ${oldVal} -> ${newVal}`)
    }
  },
  mounted() {
    console.log('组件挂载')
  }
}
```
**特点：**
- 按选项分类组织代码（data、methods、computed、watch、生命周期等）
- `this` 上下文指向当前组件实例
- 简单直观，适合小型组件
- 逻辑分散：同一功能的代码可能被拆分到不同选项中

---

### Vue 3：Composition API + `<script setup>`（组合式 API + 语法糖）
```javascript
<template>
  <button @click="increment">{{ count }}，双倍：{{ doubleCount }}</button>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// 1. 响应式数据（替代 data）
const count = ref(0)
const user = ref({ name: 'Alice' })

// 2. 计算属性（替代 computed）
const doubleCount = computed(() => count.value * 2)

// 3. 方法（替代 methods）
function increment() {
  count.value++
}

// 4. 侦听器（替代 watch）
watch(count, (newVal, oldVal) => {
  console.log(`count变化: ${oldVal} -> ${newVal}`)
})

// 5. 生命周期（替代 mounted）
onMounted(() => {
  console.log('组件挂载')
})
</script>
```
**特点：**
- 按逻辑功能组织代码，相关代码放在一起
- 无需 `this`，直接使用 ref.value
- 更好的 TypeScript 支持
- 逻辑复用更灵活（自定义组合函数）
- `<script setup>` 语法糖让代码更简洁

---

## 二、响应式数据声明

### Vue 2
```javascript
export default {
  data() {
    return {
      obj: { a: 1 },
      arr: [1, 2, 3]
    }
  },
  methods: {
    updateObj() {
      // 对象新增属性不是响应式的
      this.obj.b = 2 // ❌ 不会触发视图更新
      this.$set(this.obj, 'b', 2) // ✅ 必须用 $set
      
      // 数组通过索引修改
      this.arr[0] = 999 // ❌ 不会触发视图更新
      this.$set(this.arr, 0, 999) // ✅ 或使用数组方法
    }
  }
}
```

### Vue 3
```javascript
<script setup>
import { reactive, ref } from 'vue'

// 对象使用 reactive
const obj = reactive({ a: 1 })
obj.b = 2 // ✅ 直接修改，响应式生效

// 数组可以使用 reactive
const arr = reactive([1, 2, 3])
arr[0] = 999 // ✅ 直接修改，响应式生效

// 基本类型使用 ref（需要 .value 访问）
const count = ref(0)
count.value++ // ✅
</script>
```
- Vue 2 需要 `$set` 处理新增属性/数组索引修改
- Vue 3 的 `reactive` 和 `ref` 支持动态增删属性

---

## 三、组件通信

### 1. 父传子（Props）
#### Vue 2
```javascript
<!-- 父组件 -->
<Child :title="msg" />

<!-- 子组件 -->
<script>
export default {
  props: ['title'],
  mounted() {
    console.log(this.title)
  }
}
</script>
```

#### Vue 3
```vue
<!-- 父组件 -->
<Child :title="msg" />

<!-- 子组件 -->
<script setup>
const props = defineProps({
  title: String
})
console.log(props.title) // 直接使用
</script>

<!-- 选项式写法仍然可用 -->
<script>
export default {
  props: ['title'],
  setup(props) {
    console.log(props.title)
  }
}
</script>
```

### 2. 子传父（Emits）
#### Vue 2
```javascript
<!-- 子组件 -->
<button @click="$emit('update', value)">提交</button>

<!-- 或 -->
<script>
export default {
  methods: {
    submit() {
      this.$emit('update', this.value)
    }
  }
}
</script>

<!-- 父组件 -->
<Child @update="handleUpdate" />
```

#### Vue 3（更规范）
```javascript
<!-- 子组件 -->
<script setup>
// 声明 emits
const emit = defineEmits(['update'])

function submit() {
  emit('update', value) // 不再用 this.$emit
}
</script>

<!-- 父组件相同 -->
<Child @update="handleUpdate" />
```

### 3. 跨组件通信（Provide/Inject）
#### Vue 2
```javascript
// 祖先组件
export default {
  provide() {
    return {
      theme: 'dark'
    }
  }
}

// 后代组件
export default {
  inject: ['theme']
}
```

#### Vue 3
```javascript
<!-- 祖先组件 -->
<script setup>
import { provide } from 'vue'

provide('theme', 'dark')
</script>

<!-- 后代组件 -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme', 'light') // 第二个参数是默认值
</script>
```

---

## 四、逻辑复用

### Vue 2：Mixins（混入）
```javascript
// mixin.js
export default {
  data() {
    return {
      mixinData: 'mixin'
    }
  },
  methods: {
    mixinMethod() {
      console.log('来自mixin')
    }
  }
}

// 组件中使用
import myMixin from './mixin.js'
export default {
  mixins: [myMixin],
  mounted() {
    this.mixinMethod() // 混入的方法
  }
}
```


### Vue 3：Composables（组合函数）
```javascript
// useCounter.js
import { ref } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  
  function increment() {
    count.value++
  }
  
  return {
    count,
    increment
  }
}

// 组件中使用
<script setup>
import { useCounter } from './useCounter.js'

const { count, increment } = useCounter(10)
// 可以多次使用，互不影响
const { count: count2, increment: increment2 } = useCounter(20)
</script>
```

---

## 五、模板相关

### 1. 片段支持
#### Vue 2（不支持多根节点）
```javascript
<template>
  <div>
    <header></header>
    <main></main>
  </div>
</template>
```

#### Vue 3（支持多根节点）
```javascript
<template>
  <header></header>
  <main></main>
  <footer></footer>
</template>
```

### 2. v-model 升级
#### Vue 2：一个组件一个 v-model
```javascript
<ChildComponent v-model="pageTitle" />
<!-- 等价于 -->
<ChildComponent :value="pageTitle" @input="pageTitle = $event" />
```

#### Vue 3：支持多个 v-model
```javascript
<UserName
  v-model:first-name="first"
  v-model:last-name="last"
/>
<!-- 等价于 -->
<UserName
  :first-name="first"
  @update:first-name="first = $event"
  :last-name="last"
  @update:last-name="last = $event"
/>
```

### 3. 指令钩子改名
```javascript
bind → beforeMount
inserted → mounted
update → 移除（改用 updated）
componentUpdated → updated
unbind → unmounted
```

---

## 六、生命周期对比

| Vue 2          | Vue 3（Composition API） | 说明                 |
|----------------|--------------------------|----------------------|
| beforeCreate   | setup()                  | 在 setup 中最早执行   |
| created        | setup()                  | 在 setup 中同步执行   |
| beforeMount    | onBeforeMount            |                      |
| mounted        | onMounted                |                      |
| beforeUpdate   | onBeforeUpdate           |                      |
| updated        | onUpdated                |                      |
| beforeDestroy  | onBeforeUnmount          | 名称更贴切           |
| destroyed      | onUnmounted              | 名称更贴切           |

---


## 七、状态管理

### Vue 2 + Vuex
```javascript
// store.js
export default new Vuex.Store({
  state: { count: 0 },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    incrementAsync({ commit }) {
      setTimeout(() => commit('increment'), 1000)
    }
  }
})

// 组件中使用
computed: {
  count() {
    return this.$store.state.count
  }
},
methods: {
  increment() {
    this.$store.commit('increment')
  }
}
```

### Vue 3 + Pinia
```javascript
// store/counter.js
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++
    },
    async incrementAsync() {
      setTimeout(() => this.increment(), 1000)
    }
  }
})

// 组件中使用
<script setup>
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore()
// 直接修改
store.count++
// 或使用 action
store.increment()
</script>
```
---

## 十、异步组件

### Vue 2
```javascript
const AsyncComponent = () => ({
  component: import('./MyComponent.vue'),
  loading: LoadingComponent,
  error: ErrorComponent,
  delay: 200,
  timeout: 3000
})
```

### Vue 3（使用 defineAsyncComponent）
```javascript
<script setup>
import { defineAsyncComponent } from 'vue'

const AsyncComponent = defineAsyncComponent({
  loader: () => import('./MyComponent.vue'),
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
})
</script>
```
这个在动态导入组件还蛮好用的，用在大屏系统里比较好，单页面组件还是写router。
---

