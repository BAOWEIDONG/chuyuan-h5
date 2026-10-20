<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '请选择' },
  options: { type: Array, default: () => [] }, // [{value,label,desc,disabled,group}]
  modelValue: { type: [String, Number, Array, null], default: '' },
  multiple: Boolean,
  searchable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: '搜索' },
  emptyText: { type: String, default: '没有匹配的选项' },
  confirmText: { type: String, default: '确定' }
})
const emit = defineEmits(['update:open', 'update:modelValue', 'change'])

const keyword = ref('')
const temp = ref([])
const inputEl = ref(null)

watch(() => props.open, async (v) => {
  if (v) {
    keyword.value = ''
    temp.value = props.multiple
      ? (Array.isArray(props.modelValue) ? [...props.modelValue] : [])
      : [props.modelValue]
    await nextTick()
    inputEl.value?.focus?.()
  }
})

const filtered = computed(() => {
  const k = keyword.value.trim()
  if (!k) return props.options
  return props.options.filter(o => (o.label + (o.desc || '') + (o.group || '')).includes(k))
})

const grouped = computed(() => {
  const map = new Map()
  for (const o of filtered.value) {
    const g = o.group || ''
    if (!map.has(g)) map.set(g, [])
    map.get(g).push(o)
  }
  return [...map.entries()].map(([g, items]) => ({ g, items }))
})

function isOn(o) {
  return temp.value.includes(o.value)
}

function choose(o) {
  if (o.disabled) return
  if (props.multiple) {
    temp.value = isOn(o) ? temp.value.filter(v => v !== o.value) : [...temp.value, o.value]
  } else {
    temp.value = [o.value]
    // 单选：选中即关闭，减少点击
    emit('update:modelValue', o.value)
    emit('change', o.value)
    emit('update:open', false)
  }
}

function confirm() {
  emit('update:modelValue', temp.value)
  emit('change', temp.value)
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="mask" @click.self="emit('update:open', false)">
        <div class="sheet" role="dialog" :aria-label="title">
          <div class="sheet-head">
            <span class="t">{{ title }}</span>
            <button class="close" aria-label="关闭" @click="emit('update:open', false)"><Icon name="close" :size="18" /></button>
          </div>

          <div v-if="searchable" class="sheet-search">
            <label class="search">
              <Icon name="search" :size="17" />
              <input ref="inputEl" v-model="keyword" :placeholder="searchPlaceholder" />
              <button v-if="keyword" aria-label="清空" @click="keyword = ''"><Icon name="close" :size="15" /></button>
            </label>
          </div>

          <div class="sheet-body">
            <div v-if="!filtered.length" class="empty" style="padding:36px 0">
              <div class="t">{{ emptyText }}</div>
              <div class="small">换个关键词试试</div>
            </div>
            <div v-for="grp in grouped" :key="grp.g">
              <div v-if="grp.g" class="group-label">{{ grp.g }}</div>
              <button v-for="o in grp.items" :key="o.value" class="opt"
                      :class="{ on: isOn(o), disabled: o.disabled }"
                      :disabled="o.disabled" @click="choose(o)">
                <span :class="multiple ? 'box' : 'radio'">
                  <Icon v-if="multiple && isOn(o)" name="check" :size="13" />
                </span>
                <span class="main">
                  <span class="l">{{ o.label }}</span>
                  <span v-if="o.desc" class="d">{{ o.desc }}</span>
                </span>
                <span v-if="o.tag" class="badge muted">{{ o.tag }}</span>
              </button>
            </div>
          </div>

          <div v-if="multiple" class="sheet-foot">
            <button class="btn btn-primary" @click="confirm">{{ confirmText }}<template v-if="temp.length">（{{ temp.length }}）</template></button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-search { padding: 10px 18px 6px; }
.group-label { font-size: 12px; color: var(--ink-3); padding: 14px 0 4px; letter-spacing: .04em; }
</style>
