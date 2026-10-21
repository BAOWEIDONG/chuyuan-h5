<script setup>
// 客服电话统一走这里：渲染成真正的 tel: 链接，点击直接调起系统拨号
// 用工号常量，避免各页面手写号码写错或漏掉 href
import Icon from './Icon.vue'

const PHONE = '400-820-8866'
const TEL = 'tel:4008208866'

defineProps({
  // 是否带电话图标
  icon: { type: Boolean, default: true },
  // 纯文字链接样式（用于一段说明里内嵌号码）
  inline: { type: Boolean, default: false },
  // 只渲染号码，不带"客服"前缀（句子中间用）
  bare: { type: Boolean, default: false }
})
</script>

<template>
  <a class="call-link" :class="{ inline }" :href="TEL" :aria-label="`拨打客服电话 ${PHONE}`">
    <slot>
      <Icon v-if="icon" name="phone" :size="inline ? 13 : 15" />
      <span>{{ bare ? PHONE : `客服 ${PHONE}` }}</span>
    </slot>
  </a>
</template>

<style scoped>
.call-link {
  display: inline-flex; align-items: center; gap: 5px;
  color: var(--brand-ink); font-weight: 600; text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.call-link:active { opacity: .7; }
.call-link.inline {
  display: inline; font-weight: 600; color: var(--brand-ink);
  text-decoration: underline; text-decoration-color: var(--brand-line);
  text-underline-offset: 3px;
}
.call-link.inline svg { vertical-align: -2px; margin-right: 2px; }
</style>
