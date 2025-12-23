<template>
  <div class="app">
    <h1>{{ msg }}</h1>
    <p>Vue 2.7 REPL with TypeScript + Script Setup + SCSS</p>

    <div class="counter">
      <button class="btn" @click="decrement">-</button>
      <span class="count">{{ count }}</span>
      <button class="btn" @click="increment">+</button>
    </div>

    <p class="info">
      Double: <strong>{{ double }}</strong>
    </p>
    <Comp />
    <Comp1 />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Comp from './Comp.vue'
import Comp1 from './Comp1.vue'
// TypeScript interface demo
interface AppState {
  count: number
}

const msg = ref<string>('Welcome to Vue 2.7 REPL!')
const count = ref<number>(0)

// Computed property
const double = computed(() => count.value * 2)

// Methods
function increment(): void {
  count.value++
}

function decrement(): void {
  count.value--
}
</script>

<style scoped lang="scss">
$primary: #42b883;
$primary-dark: #3aa876;

.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-align: center;
  padding: 40px;

  h1 {
    color: $primary;
    margin-bottom: 8px;
  }

  p {
    color: #666;
    margin: 8px 0;
  }
}

.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 24px 0;
}

.btn {
  background: $primary;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  transition: background 0.2s;

  &:hover {
    background: $primary-dark;
  }

  &:active {
    transform: scale(0.95);
  }
}

.count {
  font-size: 32px;
  font-weight: bold;
  min-width: 60px;
  color: $primary;
}

.info {
  strong {
    color: $primary;
  }
}
</style>
