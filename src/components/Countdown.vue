<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { humanRemain } from '../rules/time.js'

const props = defineProps({
  deadline: { type: String, required: true },
  label: { type: String, default: '' },
  warnRatio: { type: Number, default: 0.25 }
})
const now = ref(Date.now())
let timer = null

onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => clearInterval(timer))

const remain = computed(() => new Date(props.deadline).getTime() - now.value)
const text = computed(() => humanRemain(remain.value))
const overdue = computed(() => remain.value <= 0)
</script>

<template>
  <div class="cd" :class="{ overdue }">
    <span class="cd-label">{{ label }}</span>
    <span class="cd-val num">{{ overdue ? '已超时' : '剩余 ' + text }}</span>
  </div>
</template>

<style scoped>
.cd { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; }
.cd-label { color: var(--ink-3); }
.cd-val { color: var(--ink-2); font-weight: 500; }
.cd.overdue .cd-val { color: var(--seal); }
</style>
