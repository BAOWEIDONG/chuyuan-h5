<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { store } from '../store/orders.js'
import { formatDateTime } from '../rules/time.js'

const route = useRoute()
const router = useRouter()
const order = computed(() => store.getOrder(route.params.id))
const deadline = computed(() => order.value ? formatDateTime(order.value.sla.respondDeadline) : '')
</script>

<template>
  <div class="success" v-if="order">
    <div class="s-top">
      <div class="s-check"><Icon name="check" :size="26" /></div>
      <h1 class="s-title">申请已提交</h1>
      <p class="s-sub">服务方将核验材料并与你确认行程</p>
    </div>

    <div class="card s-card">
      <div class="s-row">
        <span class="k">受理编号</span>
        <span class="v num">{{ order.id }}</span>
      </div>
      <div class="s-row">
        <span class="k">预计响应</span>
        <span class="v">{{ deadline }} 前</span>
      </div>
      <div class="s-row">
        <span class="k">出行安排</span>
        <span class="v">{{ order.travelDate }} {{ order.travelTime }}</span>
      </div>
      <div class="s-row" style="border-bottom:0">
        <span class="k">目的地</span>
        <span class="v">{{ order.address.city }}{{ order.address.district }}{{ order.address.community }}</span>
      </div>
    </div>

    <div class="steps">
      <div class="st"><span class="n">1</span><div><b>材料核验</b><p>平台核验住院材料与住址证明，缺件会通知补充</p></div></div>
      <div class="st"><span class="n">2</span><div><b>匹配运力</b><p>按医院与目的地匹配属地服务商，确认车辆与司机</p></div></div>
      <div class="st"><span class="n">3</span><div><b>行前确认</b><p>服务商提前联系，确认出院时间与上车地点</p></div></div>
    </div>

    <div class="s-note">
      <Icon name="info" :size="15" />
      <span>如临近出院提交，服务方会尽力协调，但无法保证按所选时间安排。需变更请提前 4 个工作小时联系服务商。</span>
    </div>

    <div class="s-actions">
      <button class="btn btn-primary" @click="router.replace('/order/' + order.id)">查看服务进度</button>
      <button class="btn btn-ghost" @click="router.replace('/')">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.success { padding: 34px 18px calc(24px + env(safe-area-inset-bottom)); }
.s-top { text-align: center; }
.s-check { width: 62px; height: 62px; border-radius: 50%; background: var(--brand-tint); color: var(--brand); display: grid; place-items: center; margin: 0 auto 16px; }
.s-title { font-family: var(--serif); font-size: 25px; font-weight: 700; margin: 0; }
.s-sub { font-size: 13px; color: var(--ink-3); margin: 6px 0 0; }
.s-card { margin-top: 24px; padding: 6px 16px; }
.s-row { display: flex; justify-content: space-between; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
.s-row .k { color: var(--ink-3); flex: none; }
.s-row .v { text-align: right; }
.steps { margin-top: 22px; display: grid; gap: 14px; padding: 0 2px; }
.st { display: flex; gap: 12px; }
.st .n { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line-strong); display: grid; place-items: center; font-size: 11.5px; color: var(--ink-3); flex: none; margin-top: 1px; }
.st b { font-size: 13.5px; font-weight: 600; }
.st p { font-size: 12.5px; color: var(--ink-3); margin: 3px 0 0; line-height: 1.55; }
.s-note { display: flex; gap: 8px; margin-top: 24px; padding: 12px; border-radius: 10px; background: #F1EEE7; font-size: 12px; color: var(--ink-2); line-height: 1.6; }
.s-note svg { flex: none; margin-top: 1px; color: var(--ink-3); }
.s-actions { display: grid; gap: 10px; margin-top: 24px; }
</style>
