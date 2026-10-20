<script setup>
defineProps({ total: Number, current: Number, labels: { type: Array, default: () => [] } })
</script>

<template>
  <div class="pd">
    <div v-for="i in total" :key="i" class="pd-item">
      <span class="pd-dot" :class="{ done: i < current, on: i === current }">
        <template v-if="i < current">✓</template>
        <template v-else>{{ i }}</template>
      </span>
      <span v-if="labels[i-1]" class="pd-label" :class="{ on: i === current }">{{ labels[i-1] }}</span>
    </div>
  </div>
</template>

<style scoped>
.pd { display: flex; align-items: flex-start; gap: 0; }
.pd-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.pd-item::before {
  content: ''; position: absolute; top: 12px; left: -50%; width: 100%; height: 1px; background: var(--line-strong);
}
.pd-item:first-child::before { display: none; }
.pd-dot {
  width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  font-size: 12px; background: var(--card); border: 1px solid var(--line-strong); color: var(--ink-3);
  position: relative; z-index: 1; font-weight: 600;
}
.pd-dot.done { background: var(--brand); border-color: var(--brand); color: #fff; }
.pd-dot.on { background: var(--card); border-color: var(--brand); color: var(--brand); box-shadow: 0 0 0 3px var(--brand-tint); }
.pd-label { font-size: 11px; color: var(--ink-3); margin-top: 6px; }
.pd-label.on { color: var(--brand-deep); font-weight: 600; }
</style>
