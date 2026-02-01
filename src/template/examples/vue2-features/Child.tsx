import { defineComponent, ref, computed, watch, type PropType } from 'vue'
import GrandChild from './GrandChild.vue'

export default defineComponent({
  name: 'ChildComponent',

  components: { GrandChild },

  props: {
    title: { type: String, required: true },
    count: { type: Number, default: 0 },
    items: { type: Array as PropType<string[]>, default: () => [] },
    value: { type: String, default: '' }
  },

  emits: ['custom-event', 'update:count', 'input'],

  filters: {
    truncate: (v: string, len = 10) => v.length <= len ? v : v.slice(0, len) + '...'
  },

  setup(props, { emit, slots, attrs, expose }) {
    const internalValue = ref(props.value)
    const clickCount = ref(0)

    const displayTitle = computed(() => `【${props.title}】`)
    const itemCount = computed(() => props.items.length)

    watch(internalValue, (v) => emit('input', v))

    const incrementSync = () => emit('update:count', props.count + 1)
    const decrementSync = () => emit('update:count', Math.max(0, props.count - 1))

    const emitCustomEvent = () => {
      clickCount.value++
      emit('custom-event', {
        message: 'Hello from child',
        clickCount: clickCount.value,
        timestamp: Date.now()
      })
    }

    const childMethod = (msg: string) => {
      console.log('childMethod:', msg)
      alert(`Child method called: ${msg}`)
    }

    expose({ childMethod, clickCount })

    return () => (
      <div class="child-component">
        <h2>{displayTitle.value}</h2>

        <div class="section">
          <h3>Props</h3>
          <p>Title: {props.title}</p>
          <p>Count (sync): {props.count}</p>
          <p>Items ({itemCount.value}): {props.items.join(', ')}</p>
          <p>v-model: {props.value}</p>
        </div>

        <div class="section">
          <h3>.sync Test</h3>
          <button onClick={decrementSync}>-</button>
          <span class="count-display">{props.count}</span>
          <button onClick={incrementSync}>+</button>
        </div>

        <div class="section">
          <h3>v-model Test</h3>
          <input
            value={internalValue.value}
            onInput={(e: Event) => {
              internalValue.value = (e.target as HTMLInputElement).value
            }}
            placeholder="Edit v-model"
          />
        </div>

        <div class="section">
          <h3>Custom Event</h3>
          <button onClick={emitCustomEvent}>
            Emit custom-event ({clickCount.value} clicks)
          </button>
        </div>

        <div class="section">
          <h3>Slots</h3>
          <div class="slot-box">
            <span class="slot-label">header:</span>
            {slots.header?.() || <span class="fallback">Default header</span>}
          </div>
          <div class="slot-box">
            <span class="slot-label">default:</span>
            {slots.default?.() || <span class="fallback">Default content</span>}
          </div>
          <div class="slot-box">
            <span class="slot-label">scoped:</span>
            {props.items.map((item, index) => (
              <div key={index}>
                {slots.scoped?.({ item, index }) || <span>{index}: {item}</span>}
              </div>
            ))}
          </div>
          <div class="slot-box">
            <span class="slot-label">footer:</span>
            {slots.footer?.() || <span class="fallback">Default footer</span>}
          </div>
        </div>

        <div class="section">
          <h3>$attrs</h3>
          <pre>{JSON.stringify(attrs, null, 2)}</pre>
        </div>

        <div class="section">
          <h3>Conditional (JSX)</h3>
          {props.count > 5
            ? <p class="highlight">Count &gt; 5!</p>
            : <p>Count &lt;= 5</p>
          }
        </div>

        <div class="section">
          <h3>Dynamic Style</h3>
          <div
            class={['dynamic-box', { active: props.count > 3 }]}
            style={{
              backgroundColor: props.count > 5 ? '#42b883' : '#ddd',
              color: props.count > 5 ? 'white' : 'black',
              padding: '10px',
              borderRadius: '4px',
              transition: 'all 0.3s'
            }}
          >
            Dynamic style (count: {props.count})
          </div>
        </div>

        <div class="section">
          <h3>GrandChild (inject demo)</h3>
          <GrandChild onClick={() => {
              alert('$listeners works! Event bubbled from GrandChild')
              emit('custom-event', { from: 'grandchild' })
            }} />
        </div>

        <style>{`
          .child-component {
            border: 2px solid #42b883;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            background: #f9f9f9;
          }
          .child-component h2 { color: #35495e; margin-top: 0; }
          .child-component h3 { color: #42b883; font-size: 14px; margin: 0 0 8px; }
          .child-component .section {
            margin: 12px 0; padding: 12px;
            background: white; border-radius: 4px; border: 1px solid #eee;
          }
          .child-component button {
            background: #42b883; color: white; border: none;
            padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;
          }
          .child-component button:hover { background: #3aa876; }
          .child-component .count-display {
            display: inline-block; min-width: 40px; text-align: center;
            font-size: 18px; font-weight: bold; margin: 0 8px;
          }
          .child-component input {
            padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px;
            background: #fff; color: #333;
          }
          .child-component .slot-box {
            margin: 8px 0; padding: 8px;
            border: 1px dashed #ccc; border-radius: 4px;
          }
          .child-component .slot-label { color: #666; font-size: 12px; font-weight: bold; }
          .child-component .fallback { color: #999; font-style: italic; }
          .child-component .highlight { color: #42b883; font-weight: bold; }
          .child-component .active { border: 2px solid #42b883 !important; }
          .child-component pre {
            background: #eee; padding: 8px; border-radius: 4px;
            overflow: auto; font-size: 12px; margin: 0;
          }

          /* Dark mode */
          html.dark .child-component {
            background: #2a2a2a;
          }
          html.dark .child-component h2 { color: #9ca3af; }
          html.dark .child-component .section {
            background: #333; border-color: #404040;
          }
          html.dark .child-component .count-display { color: #e0e0e0; }
          html.dark .child-component input {
            background: #444; border-color: #555; color: #e0e0e0;
          }
          html.dark .child-component .slot-box {
            border-color: #555;
          }
          html.dark .child-component .slot-label { color: #9ca3af; }
          html.dark .child-component .fallback { color: #6b7280; }
          html.dark .child-component pre {
            background: #1e1e1e; color: #e0e0e0;
          }
        `}</style>
      </div>
    )
  }
})
