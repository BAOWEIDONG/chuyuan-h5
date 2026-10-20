<script setup>
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'
const props = defineProps({ title: String, back: { type: [Boolean, String], default: true }, right: String })
const emit = defineEmits(['right'])
const router = useRouter()
function goBack() {
  if (typeof props.back === 'string') router.push(props.back)
  else if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <header class="navbar">
    <button v-if="back" class="back" aria-label="返回" @click="goBack"><Icon name="back" :size="20" /></button>
    <span class="title">{{ title }}</span>
    <button v-if="right" class="right" @click="emit('right')">{{ right }}</button>
    <slot name="right" />
  </header>
</template>
