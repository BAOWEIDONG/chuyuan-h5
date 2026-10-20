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
      <div class="s-check"><Icon name="check" :size="30" /></div>
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
  <div v-else class="empty" style="padding-top:120px">
    <div class="t">没有找到这笔申请</div>
    <div class="small">可能已在其他设备提交，请到服务记录中查看</div>
    <button class="btn btn-primary btn-sm" style="margin-top:18px;display:inline-flex" @click="router.replace('/orders')">查看服务记录</button>
  </div>
</template>

<style scoped>
.success { padding: 40px 16px calc(24px + env(safe-area-inset-bottom)); }
.s-top { text-align: center; }
.s-check {
  width: 74px; height: 74px; border-radius: 26px; margin: 0 auto 18px;
  background: var(--grad); color: #fff; display: grid; place-items: center;
  box-shadow: 0 18px 34px rgba(255, 90, 0, .3), inset 0 1.5px 1px rgba(255, 255, 255, .5);
}
.s-title { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: .5px; }
.s-sub { font-size: 13.5px; color: var(--ink-3); margin: 8px 0 0; }
.s-card { margin-top: 26px; padding: 4px 16px; border-radius: 20px; }
.s-row { display: flex; justify-content: space-between; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
.s-row:last-child { border-bottom: 0; }
.s-row .k { color: var(--ink-3); flex: none; }
.s-row .v { text-align: right; font-weight: 500; }
.steps { margin-top: 22px; display: grid; gap: 14px; padding: 4px 2px; }
.st { display: flex; gap: 12px; }
.st .n {
  width: 24px; height: 24px; border-radius: 9px; flex: none; margin-top: 1px;
  background: var(--brand-tint); color: var(--brand-ink);
  display: grid; place-items: center; font-size: 11.5px; font-weight: 700;
}
.st b { font-size: 14px; font-weight: 700; }
.st p { font-size: 12.5px; color: var(--ink-3); margin: 4px 0 0; line-height: 1.6; }
.s-note {
  display: flex; gap: 8px; margin-top: 24px; padding: 13px 14px; border-radius: 16px;
  background: rgba(255, 255, 255, .72); border: 1px solid rgba(255, 255, 255, .95);
  font-size: 12px; color: var(--ink-2); line-height: 1.65;
}
.s-note svg { flex: none; margin-top: 1px; color: var(--ink-3); }
.s-actions { display: grid; gap: 10px; margin-top: 26px; }
</style>
