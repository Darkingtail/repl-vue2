<!-- eslint-disable vue/no-deprecated-filter, vue/no-deprecated-v-on-native-modifier, vue/no-v-html -->
<template>
  <div class="app">
    <header class="header">
      <h1>Vue 2 Features</h1>
    </header>

    <div class="grid">
      <!-- Filters -->
      <section class="card">
        <h2><span class="tag">Vue 2</span> Filters</h2>
        <div class="result">{{ message | capitalize | addSuffix('!') }}</div>
        <div class="chips">
          <span v-for="item in items" :key="item" class="chip">
            {{ item }} → {{ item | reverse }}
          </span>
        </div>
      </section>

      <!-- Data Binding -->
      <section class="card">
        <h2>Data Binding</h2>
        <div class="field col">
          <label>v-model</label>
          <input v-model="inputValue" placeholder="Type..." />
          <span class="value wrap">{{ inputValue || '—' }}</span>
        </div>
        <div class="field">
          <label>.sync</label>
          <span class="value lg">{{ syncValue }}</span>
        </div>
        <div class="field">
          <label>v-html</label>
          <span v-html="htmlContent" />
        </div>
      </section>

      <!-- Conditionals -->
      <section class="card">
        <h2>Conditionals</h2>
        <div class="field">
          <label>v-if/else</label>
          <span v-if="count > 10" class="badge green">count &gt; 10</span>
          <span v-else-if="count > 5" class="badge yellow">count &gt; 5</span>
          <span v-else class="badge gray">count &lt;= 5</span>
        </div>
        <div class="field">
          <label>v-show</label>
          <span v-show="showText" class="value">Visible</span>
          <button class="sm" @click="showText = !showText">Toggle</button>
        </div>
      </section>

      <!-- Events -->
      <section class="card">
        <h2>Event Modifiers</h2>
        <div class="row">
          <button @click.stop.prevent="handleClick">.stop.prevent</button>
          <input placeholder="Press Enter" @keyup.enter="handleEnter" />
        </div>
        <div class="log">{{ eventLog || 'No event yet' }}</div>
      </section>

      <!-- Transition -->
      <section class="card">
        <h2>Transition</h2>
        <button @click="showTransition = !showTransition">Toggle</button>
        <transition name="fade">
          <div v-if="showTransition" class="transition-box">Fade In/Out</div>
        </transition>
      </section>

      <!-- keep-alive -->
      <section class="card">
        <h2>keep-alive</h2>
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab"
            :class="{ active: currentTab === tab }"
            @click="currentTab = tab"
          >
            {{ tab }}
          </button>
        </div>
        <keep-alive>
          <component :is="currentTabComponent" />
        </keep-alive>
      </section>

      <!-- Provide/Inject -->
      <section class="card">
        <h2><span class="tag">Vue 2</span> Provide/Inject</h2>
        <div class="field">
          <label>theme</label>
          <button class="sm" @click="theme = theme === 'light' ? 'dark' : 'light'">
            {{ theme }}
          </button>
        </div>
        <p class="desc">GrandChild 通过 inject 接收 theme, count</p>
      </section>

      <!-- Computed & Watch -->
      <section class="card">
        <h2>Computed & Watch</h2>
        <div class="field">
          <label>count</label>
          <button @click="increment">+1</button>
          <button class="sm" @click="count = 0">Reset</button>
          <span class="value lg">{{ count }}</span>
        </div>
        <div class="field">
          <label>computed</label>
          <span class="value">{{ computedMessage }}</span>
        </div>
        <p class="desc">watch 会在控制台输出 count 变化</p>
      </section>
    </div>

    <!-- Child Component -->
    <section class="card full">
      <h2>Child Component <span class="tag">TSX</span></h2>
      <ChildComponent
        ref="childRef"
        v-model:count="syncValue"
        v-model="childModelValue"
        :title="title"
        :items="items"
        @custom-event="handleCustomEvent"
        @click.native="handleNativeClick"
      >
        <template #header>
          <strong>Header Slot</strong>
        </template>
        <template #footer>
          <em>Footer Slot</em>
        </template>
        <template #scoped="{ item, index }">
          <span class="scoped-item">{{ index }}: {{ item | uppercase }}</span>
        </template>
        <span>Default Slot</span>
      </ChildComponent>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, provide, ref, watch } from 'vue'
import ChildComponent from './Child.tsx'

defineOptions({
  filters: {
    capitalize: (v: string) =>
      v ? v.charAt(0).toUpperCase() + v.slice(1) : '',
    addSuffix: (v: string, s: string) => v + s,
    uppercase: (v: string) => v.toUpperCase(),
    reverse: (v: string) => v.split('').reverse().join(''),
  },
})

const message = ref('hello vue 2')
const inputValue = ref('')
const syncValue = ref(0)
const childModelValue = ref('model-value')
const title = ref('Child Title')
const items = ref(['Apple', 'Banana', 'Cherry'])
const count = ref(0)

const theme = ref<'light' | 'dark'>('light')
provide('theme', theme)
provide('appName', 'Vue2 REPL Demo')
provide(
  'injectedCount',
  computed(() => count.value),
)

const showText = ref(true)
const showTransition = ref(false)
const htmlContent = ref('<b style="color:#42b883">Bold</b>')
const eventLog = ref('')
const childRef = ref<any>(null)

const tabs = ['TabA', 'TabB']
const currentTab = ref('TabA')
const currentTabComponent = computed(() =>
  currentTab.value === 'TabA' ? TabA : TabB,
)

const TabA = {
  template: `<div class="tab-panel a"><input class="tab-input" v-model="v" placeholder="State kept" /><span class="tab-text">{{ v }}</span></div>`,
  data: () => ({ v: '' }),
}
const TabB = {
  template: `<div class="tab-panel b"><button @click="n++">+</button><span class="tab-text">{{ n }}</span></div>`,
  data: () => ({ n: 0 }),
}

const computedMessage = computed(() => `${message.value} (${count.value})`)

watch(count, (n, o) => console.log(`count: ${o} -> ${n}`))

const increment = () => count.value++
const handleClick = () => {
  eventLog.value = '.stop.prevent'
}
const handleEnter = () => {
  eventLog.value = '@keyup.enter'
}
const handleCustomEvent = (p: any) => {
  eventLog.value = JSON.stringify(p)
}
const handleNativeClick = () => {
  eventLog.value = '.native'
}
const callChildMethod = async () => {
  await nextTick()
  childRef.value?.childMethod('Hello')
}

onMounted(() => console.log('App mounted'))
defineExpose({ message, count })
</script>

<style lang="scss" scoped>
$accent: #42b883;
$bg: #f8f9fa;
$card: #fff;
$border: #e5e7eb;
$text: #374151;
$muted: #6b7280;

.app {
  padding: 16px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: $text;
  min-height: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid $accent;

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: $accent;
  }
}

.header-controls {
  display: flex;
  gap: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.card {
  background: $card;
  border: 1px solid $border;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
  min-width: 0;

  &.full {
    grid-column: 1 / -1;
  }

  h2 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: $muted;
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.tag {
  background: $accent;
  color: #fff;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 700;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
  font-size: 13px;
  min-width: 0;

  label {
    color: $muted;
    font-size: 11px;
    min-width: 50px;
    flex-shrink: 0;
  }

  &.col {
    flex-direction: column;
    align-items: flex-start;
    input {
      width: 100%;
      box-sizing: border-box;
    }
  }
}

.value {
  color: $accent;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  &.lg {
    font-size: 18px;
  }
  &.wrap {
    white-space: normal;
    word-break: break-word;
    width: 100%;
  }
}

.row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.chip {
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  border-left: 2px solid $accent;
}

.result {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 14px;
  margin: 6px 0;
}

.log {
  background: #f0fdf4;
  padding: 6px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  margin-top: 8px;
  color: #166534;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc {
  font-size: 12px;
  color: $muted;
  margin: 4px 0;
  code {
    background: #f3f4f6;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 11px;
  }
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  &.green {
    background: #d1fae5;
    color: #166534;
  }
  &.yellow {
    background: #fef3c7;
    color: #b45309;
  }
  &.gray {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  button {
    padding: 4px 10px;
    font-size: 12px;
    &.active {
      background: #35495e;
    }
  }
}

.tab-panel {
  padding: 8px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  &.a {
    background: #ecfdf5;
  }
  &.b {
    background: #eff6ff;
  }
}
.tab-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.tab-text {
  word-break: break-word;
  width: 100%;
}

.transition-box {
  margin-top: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, $accent, #35495e);
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
}

.scoped-item {
  color: $accent;
  font-weight: 600;
}

button {
  background: $accent;
  color: #fff;
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  &:hover {
    filter: brightness(0.9);
  }
  &.sm {
    padding: 3px 8px;
    font-size: 11px;
  }
}

input {
  padding: 5px 8px;
  border: 1px solid $border;
  border-radius: 4px;
  font-size: 12px;
  background: #fff;
  color: $text;
  width: 100px;
  min-width: 0;
  &:focus {
    border-color: $accent;
    outline: none;
  }
}

code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #7c3aed;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

// Dark Mode
:global(html.dark) {
  .app {
    color: #e5e7eb;
  }
  .header h1 {
    color: #6ee7b7;
  }
  .card {
    background: #1f2937;
    border-color: #374151;
  }
  .card h2 {
    color: #9ca3af;
  }
  .tag {
    background: #10b981;
  }
  .chip {
    background: #374151;
    border-color: #10b981;
  }
  .result {
    background: linear-gradient(135deg, #064e3b, #065f46);
  }
  .log {
    background: #064e3b;
    color: #a7f3d0;
  }
  .desc code {
    background: #374151;
  }
  .badge {
    &.green {
      background: #064e3b;
      color: #6ee7b7;
    }
    &.yellow {
      background: #78350f;
      color: #fcd34d;
    }
    &.gray {
      background: #374151;
      color: #9ca3af;
    }
  }
  .tab-panel {
    &.a {
      background: #064e3b;
    }
    &.b {
      background: #1e3a5f;
    }
  }
  input {
    background: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }
  code {
    background: #374151;
    color: #c4b5fd;
  }
  .field label {
    color: #9ca3af;
  }
  .value {
    color: #6ee7b7;
  }
}
</style>
