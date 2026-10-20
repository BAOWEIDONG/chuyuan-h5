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
.pd { display: flex; align-items: flex-start; padding: 14px 2px 2px; }
.pd-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.pd-item::before {
  content: ''; position: absolute; top: 12px; left: -50%; width: 100%; height: 2px; background: var(--line); border-radius: 1px;
}
.pd-item:first-child::before { display: none; }
.pd-item:has(.pd-dot.done)::before { background: rgba(255, 122, 31, .35); }
.pd-dot {
  width: 25px; height: 25px; border-radius: 50%; display: grid; place-items: center;
  font-size: 11.5px; background: #fff; border: 1.5px solid rgba(60, 60, 67, .16); color: var(--ink-3);
  position: relative; z-index: 1; font-weight: 700;
}
.pd-dot.done { background: var(--grad); border-color: transparent; color: #fff; box-shadow: 0 3px 8px rgba(255, 90, 0, .22); }
.pd-dot.on { background: #fff; border-color: transparent; color: var(--brand-ink); box-shadow: 0 0 0 2px var(--brand) inset; }
.pd-label { font-size: 10.5px; color: var(--ink-3); margin-top: 7px; white-space: nowrap; }
.pd-label.on { color: var(--brand-ink); font-weight: 700; }
</style>
