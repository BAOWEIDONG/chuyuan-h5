<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { ymd, ymdCn } from '../rules/time.js'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '选择日期' },
  dates: { type: Array, default: () => [] }, // Date[]
  modelValue: { type: String, default: '' },
  disabledHint: { type: String, default: '' }
})
const emit = defineEmits(['update:open', 'update:modelValue'])

const picked = ref('')
watch(() => props.open, v => { if (v) picked.value = props.modelValue || '' })

const items = computed(() => props.dates.map(d => ({
  value: ymd(d),
  day: d.getDate(),
  week: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
  label: ymdCn(d),
  isWeekend: [0, 6].includes(d.getDay())
})))

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
        <div class="sheet" role="dialog" :aria-label="title">
          <div class="sheet-head">
            <span class="t">{{ title }}</span>
            <button class="close" aria-label="关闭" @click="emit('update:open', false)"><Icon name="close" :size="18" /></button>
          </div>
          <div class="sheet-body">
            <p v-if="disabledHint" class="small muted" style="margin-top:0">{{ disabledHint }}</p>
            <div class="date-grid">
              <button v-for="it in items" :key="it.value" class="date-cell"
                      :class="{ on: picked === it.value }" @click="picked = it.value">
                <span class="w">{{ it.week }}</span>
                <span class="d num">{{ it.day }}</span>
                <span class="s">{{ it.label }}</span>
              </button>
            </div>
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
.date-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.date-cell {
  border: 1px solid var(--line-strong); border-radius: 12px; padding: 12px 6px;
  display: grid; gap: 2px; justify-items: center; background: var(--card);
}
.date-cell .w { font-size: 12px; color: var(--ink-3); }
.date-cell .d { font-size: 22px; font-weight: 700; line-height: 1.1; }
.date-cell .s { font-size: 11px; color: var(--ink-3); }
.date-cell.on { border-color: var(--brand); background: var(--brand-tint); box-shadow: inset 0 0 0 1px var(--brand); }
.date-cell.on .d { color: var(--brand-deep); }
</style>
