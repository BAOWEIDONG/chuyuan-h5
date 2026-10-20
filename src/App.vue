<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 甲方入口页自带深色底，不需要外围纸张留白
const isEntry = computed(() => route.name === 'demoEntry')
</script>

<template>
  <div class="shell" :class="{ 'from-app': isEntry }">
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </div>
</template>
