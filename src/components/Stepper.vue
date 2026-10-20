<script setup>
import Icon from './Icon.vue'
const props = defineProps({
  modelValue: { type: Number, default: 1 },
  min: { type: Number, default: 1 },
  max: { type: Number, default: 9 },
  label: String,
  hint: String
})
const emit = defineEmits(['update:modelValue'])
function set(v) {
  const n = Math.max(props.min, Math.min(props.max, v))
  emit('update:modelValue', n)
}
</script>

<template>
  <div class="stepper-wrap">
    <div class="stepper">
      <button class="sb" :disabled="modelValue <= min" aria-label="减少" @click="set(modelValue - 1)"><Icon name="minus" :size="17" /></button>
      <span class="val num">{{ modelValue }}<template v-if="label"> {{ label }}</template></span>
      <button class="sb" :disabled="modelValue >= max" aria-label="增加" @click="set(modelValue + 1)"><Icon name="plus" :size="17" /></button>
    </div>
    <p v-if="hint" class="tiny muted" style="margin:6px 0 0">{{ hint }}</p>
  </div>
</template>

<style scoped>
.stepper-wrap { display: flex; flex-direction: column; align-items: flex-end; }
.stepper { display: flex; align-items: center; gap: 2px; border: 1px solid var(--hairline); border-radius: 14px; padding: 3px; background: rgba(255, 255, 255, .8); }
.sb { width: 34px; height: 32px; display: grid; place-items: center; border-radius: 11px; color: var(--brand-ink); }
.sb:disabled { opacity: .28; }
.sb:active:not(:disabled) { background: var(--brand-tint); }
.val { min-width: 58px; text-align: center; font-size: 15px; font-weight: 700; }
</style>
