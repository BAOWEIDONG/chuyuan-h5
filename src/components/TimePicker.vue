<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({ open: Boolean, modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:open', 'update:modelValue'])

const picked = ref('')
watch(() => props.open, v => { if (v) picked.value = props.modelValue || '' })

// 30 分钟一格，9:00–20:30 为服务时段，其余置为"时段外"但仍可选（软提示）
const slots = computed(() => {
  const out = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      out.push({ value: t, label: t, outside: h < 9 || h >= 21 })
    }
  }
  return out
})

const morning = computed(() => slots.value.filter(s => Number(s.value.slice(0, 2)) < 9))
const inService = computed(() => slots.value.filter(s => !s.outside))
const evening = computed(() => slots.value.filter(s => Number(s.value.slice(0, 2)) >= 21))

function pick(v) { picked.value = v }

function confirm() {
  if (!picked.value) return
  emit('update:modelValue', picked.value)
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="mask" @click.self="emit('update:open', false)">
        <div class="sheet" role="dialog" aria-label="选择出行时间">
          <div class="sheet-head">
            <span class="t">选择出行时间</span>
            <button class="close" aria-label="关闭" @click="emit('update:open', false)"><Icon name="close" :size="18" /></button>
          </div>
          <div class="sheet-body">
            <div class="slot-group">
              <div class="g-label">服务时段内 9:00–21:00</div>
              <div class="slots">
                <button v-for="s in inService" :key="s.value" class="slot" :class="{ on: picked === s.value }" @click="pick(s.value)">{{ s.label }}</button>
              </div>
            </div>
            <details class="outside">
              <summary class="small muted">需要其他时间？</summary>
              <p class="tiny muted" style="margin:8px 0">服务时间为工作日 9:00–21:00。选择时段外时间将标记为需协调，实际以服务商沟通为准。</p>
              <div class="slots">
                <button v-for="s in [...morning, ...evening]" :key="s.value" class="slot outside" :class="{ on: picked === s.value }" @click="pick(s.value)">{{ s.label }}</button>
              </div>
            </details>
          </div>
          <div class="sheet-foot">
            <button class="btn btn-primary" :disabled="!picked" @click="confirm">确定</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slot-group { margin-bottom: 12px; }
.g-label { font-size: 12px; color: var(--ink-3); margin-bottom: 8px; }
.slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.slot { padding: 9px 0; border-radius: 9px; border: 1px solid var(--line-strong); font-size: 14px; background: var(--card); font-variant-numeric: tabular-nums; }
.slot.on { border-color: var(--brand); background: var(--brand-tint); color: var(--brand-deep); font-weight: 600; }
.slot.outside { color: var(--ink-3); }
.outside { margin-top: 4px; }
summary { cursor: pointer; }
</style>
