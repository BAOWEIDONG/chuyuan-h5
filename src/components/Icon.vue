<script setup>
// 极简线性图标：统一 1.5 描边、24 网格，避免图标风格混杂
const props = defineProps({ name: String, size: { type: [Number, String], default: 20 }, fill: { type: Boolean, default: false } })
const paths = {
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 6l6 6-6 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm5.5.5L21 21',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  calendar: 'M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  hospital: 'M4 21V8l8-5 8 5v13M9 21v-5h6v5M12 8v4M10 10h4',
  car: 'M4 16v-4l2-5h12l2 5v4M4 16h16M7 16v2M17 16v2M7 12h10',
  train: 'M7 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM5 10h14M9 19l-2 2M15 19l2 2M9 13h.01M15 13h.01',
  phone: 'M5 4h3l2 5-2 1.5a12 12 0 0 0 5.5 5.5L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  shield: 'M12 3l7 3v6c0 4.2-3 7.6-7 9-4-1.4-7-4.8-7-9V6l7-3zM9 12l2 2 4-4',
  doc: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4zM14 3v4h4M9 13h6M9 17h4',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4V8zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  bell: 'M18 16V11a6 6 0 1 0-12 0v5l-2 3h16l-2-3zM10 22h4',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  book: 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5zM8 7h7M8 11h7',
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9z',
  alert: 'M12 4l9 16H3l9-16zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  ticket: 'M3 9V6h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6zM12 6v12',
  edit: 'M4 20h4L20 8l-4-4L4 16v4zM14 6l4 4',
  refresh: 'M20 11a8 8 0 1 0-2.3 6M20 5v6h-6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8L12 3.5z'
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" :fill="fill ? 'currentColor' : 'none'"
       stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
       aria-hidden="true">
    <path :d="paths[name] || ''" />
  </svg>
</template>
