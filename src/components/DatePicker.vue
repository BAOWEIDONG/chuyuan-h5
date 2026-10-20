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
.date-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.date-cell {
  border: 1.5px solid transparent; border-radius: 16px; padding: 12px 6px;
  display: grid; gap: 3px; justify-items: center; background: var(--fill);
  transition: all .15s ease;
}
.date-cell .w { font-size: 11.5px; color: var(--ink-3); }
.date-cell .d { font-size: 21px; font-weight: 800; line-height: 1.1; letter-spacing: -.2px; }
.date-cell .s { font-size: 10.5px; color: var(--ink-3); }
.date-cell.on { border-color: var(--brand-line); background: rgba(255, 246, 238, .96); box-shadow: 0 6px 16px rgba(255, 102, 0, .1); }
.date-cell.on .d { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.date-cell.on .w, .date-cell.on .s { color: var(--brand-ink); }
</style>
