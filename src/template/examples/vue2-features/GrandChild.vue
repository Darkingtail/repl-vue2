<!-- eslint-disable vue/no-deprecated-dollar-listeners-api -->
<template>
  <div class="grandchild">
    <h4>GrandChild Component</h4>

    <!-- ========== Inject ========== -->
    <div class="section">
      <h5>Inject (from App.vue)</h5>
      <p>Theme: <span class="badge" :class="theme">{{ theme }}</span></p>
      <p>App Name: {{ appName }}</p>
      <p>Injected Count: {{ injectedCount }}</p>
    </div>

    <!-- ========== $listeners ========== -->
    <div class="section">
      <h5>$listeners</h5>
      <button v-on="$listeners">Click (uses $listeners)</button>
      <p class="hint">Events bubble up via $listeners</p>
    </div>

    <!-- ========== $set / $delete ========== -->
    <div class="section">
      <h5>$set / $delete</h5>
      <div class="feature-row">
        <button @click="addDynamicProp">$set</button>
        <button @click="removeDynamicProp">$delete</button>
      </div>
      <pre>{{ JSON.stringify(dynamicObj, null, 2) }}</pre>
    </div>

    <!-- ========== v-once ========== -->
    <div class="section">
      <h5>v-once</h5>
      <p v-once>Static (v-once): {{ initialValue }}</p>
      <p>Dynamic: {{ initialValue }}</p>
      <button @click="initialValue++">Increment ({{ initialValue }})</button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'GrandChild',

  inject: {
    theme: { default: 'light' },
    appName: { default: 'Unknown' },
    injectedCount: { default: 0 }
  },

  data() {
    return {
      dynamicObj: { existing: 'value' } as Record<string, any>,
      initialValue: 0
    }
  },

  methods: {
    addDynamicProp() {
      // Vue 2 $set for reactive property addition
      this.$set(this.dynamicObj, 'newProp_' + Date.now(), Math.random().toFixed(2))
    },
    removeDynamicProp() {
      const keys = Object.keys(this.dynamicObj).filter(k => k !== 'existing')
      if (keys.length > 0) {
        // Vue 2 $delete for reactive property removal
        this.$delete(this.dynamicObj, keys[keys.length - 1])
      }
    }
  }
})
</script>

<style scoped>
.grandchild {
  border: 2px dashed #f59e0b;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  background: #fffbeb;
}

.grandchild h4 {
  color: #d97706;
  margin: 0 0 12px;
  font-size: 14px;
}

.grandchild h5 {
  color: #92400e;
  font-size: 12px;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.grandchild .section {
  margin: 10px 0;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #fde68a;
}

.grandchild .badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.grandchild .badge.light { background: #fef3c7; color: #92400e; }
.grandchild .badge.dark { background: #1f2937; color: #fbbf24; }

.grandchild button {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 4px;
}
.grandchild button:hover { background: #d97706; }

.grandchild pre {
  background: #fef3c7;
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  margin: 8px 0 0;
  overflow: auto;
}

.grandchild .hint {
  font-size: 11px;
  color: #92400e;
  margin: 4px 0 0;
}

.grandchild .feature-row {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

/* Dark mode */
:global(html.dark) .grandchild {
  background: #292524;
  border-color: #78350f;
}
:global(html.dark) .grandchild h4 { color: #fbbf24; }
:global(html.dark) .grandchild h5 { color: #fcd34d; }
:global(html.dark) .grandchild .section {
  background: #1c1917;
  border-color: #78350f;
}
:global(html.dark) .grandchild pre {
  background: #1c1917;
  color: #fcd34d;
}
:global(html.dark) .grandchild .hint { color: #fcd34d; }
</style>
