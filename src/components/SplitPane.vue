<template>
  <div
    ref="container"
    class="split-pane"
    :class="{
      dragging: state.dragging,
      vertical: isVertical,
    }"
    @mousemove="dragMove"
    @mouseup="dragEnd"
    @mouseleave="dragEnd"
  >
    <div
      class="left"
      :style="{ [isVertical ? 'height' : 'width']: boundSplit + '%' }"
    >
      <slot name="left" />
      <div class="dragger" @mousedown.prevent="dragStart" />
    </div>
    <div
      class="right"
      :style="{ [isVertical ? 'height' : 'width']: 100 - boundSplit + '%' }"
    >
      <slot name="right" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed } from 'vue'

export default defineComponent({
  name: 'SplitPane',
  props: {
    layout: {
      type: String as () => 'horizontal' | 'vertical',
      default: 'horizontal',
    },
  },
  setup(props) {
    const container = ref<HTMLElement | null>(null)
    const isVertical = computed(() => props.layout === 'vertical')

    const state = reactive({
      dragging: false,
      split: 50,
    })

    const boundSplit = computed(() => {
      const { split } = state
      return split < 20 ? 20 : split > 80 ? 80 : split
    })

    let startPosition = 0
    let startSplit = 0

    function dragStart(e: MouseEvent) {
      state.dragging = true
      startPosition = isVertical.value ? e.pageY : e.pageX
      startSplit = boundSplit.value
    }

    function dragMove(e: MouseEvent) {
      if (container.value && state.dragging) {
        const position = isVertical.value ? e.pageY : e.pageX
        const totalSize = isVertical.value
          ? container.value.offsetHeight
          : container.value.offsetWidth
        const dp = position - startPosition
        state.split = startSplit + +((dp / totalSize) * 100).toFixed(2)
      }
    }

    function dragEnd() {
      state.dragging = false
    }

    return {
      container,
      state,
      isVertical,
      boundSplit,
      dragStart,
      dragMove,
      dragEnd,
    }
  },
})
</script>

<style scoped>
.split-pane {
  display: flex;
  height: 100%;
  position: relative;
}

.split-pane.vertical {
  display: block;
}

.split-pane.dragging {
  cursor: ew-resize;
}

.split-pane.vertical.dragging {
  cursor: ns-resize;
}

/* Prevent event stealing during drag */
.dragging .left,
.dragging .right {
  pointer-events: none;
}

.left,
.right {
  position: relative;
  height: 100%;
}

.left {
  border-right: 1px solid var(--border);
}

.vertical .left {
  border-right: none;
  border-bottom: 1px solid var(--border);
}

.vertical .left,
.vertical .right {
  width: 100%;
}

.dragger {
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  right: -5px;
  width: 10px;
  cursor: ew-resize;
}

.dragger:hover {
  background: var(--color-branding);
  opacity: 0.3;
}

.vertical .dragger {
  top: auto;
  height: 10px;
  width: 100%;
  left: 0;
  right: 0;
  bottom: -5px;
  cursor: ns-resize;
}
</style>
