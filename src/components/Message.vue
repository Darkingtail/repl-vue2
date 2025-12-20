<template>
  <div v-if="errors.length" class="msg-container">
    <div v-for="(err, idx) in errors" :key="idx" class="msg error">
      <pre>{{ formatError(err) }}</pre>
      <button class="dismiss" @click="$emit('dismiss', idx)">&times;</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'Message',
  props: {
    errors: {
      type: Array as PropType<(string | Error)[]>,
      required: true,
    },
  },
  emits: ['dismiss'],
  methods: {
    formatError(err: string | Error): string {
      if (typeof err === 'string') return err
      return err.message || String(err)
    },
  },
})
</script>

<style scoped>
.msg-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 50%;
  overflow-y: auto;
}

.msg {
  position: relative;
  padding: 12px 40px 12px 16px;
  font-family: var(--font-code);
  font-size: 13px;
  line-height: 1.5;
}

.msg.error {
  background-color: #fff0f0;
  color: #c00;
  border-top: 1px solid #ffccc7;
}

.msg pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.dismiss {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  opacity: 0.6;
}

.dismiss:hover {
  opacity: 1;
}

.dark .msg.error {
  background-color: #2a1515;
  border-top-color: #5c2020;
}
</style>
