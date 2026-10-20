<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { session, maskId } from '../store/session.js'
import { store, activeOrder, unreadCount } from '../store/orders.js'
import { STATUS_META, CLOSE_REASON } from '../rules/status.js'
import { formatDateTime } from '../rules/time.js'

const router = useRouter()
const member = computed(() => session.member || {})
const order = computed(() => activeOrder.value)
const latestClosed = computed(() => store.orders.find(o => ['COMPLETED', 'CLOSED'].includes(o.status)))
const remaining = computed(() => member.value.remaining ?? 1)

function goBook() {
  router.push('/eligibility')
}

const statusText = computed(() => {
  if (!order.value) return ''
  return STATUS_META[order.value.status]?.label || ''
})

const nextAction = computed(() => {
  const o = order.value
  if (!o) return ''
  switch (o.status) {
    case 'REVIEWING': return '材料正在核验，预计 12 个工作小时内完成'
    case 'NEED_INFO': return '有材料需要重新上传，请及时补充'
    case 'DISPATCHING': return '正在匹配属地服务商，预计 24 个工作小时内确认'
    case 'CONFIRMED': return `${o.travelDate} ${o.travelTime} 出行，服务商将提前联系`
    case 'ON_THE_WAY': return '车辆正在前往医院，请保持电话畅通'
    case 'IN_SERVICE': return '行程进行中'
    default: return ''
  }
})
</script>

<template>
  <div class="page home">
    <header class="home-head">
      <div>
        <div class="hello">你好，{{ member.memberName || '客户' }}</div>
        <div class="pol tiny">保单 {{ member.policyNo }} · 被保险人本人</div>
      </div>
      <button class="msg-btn" aria-label="消息" @click="router.push('/messages')">
        <Icon name="bell" :size="20" />
        <span v-if="unreadCount" class="dot">{{ unreadCount }}</span>
      </button>
    </header>

    <!-- 权益卡：宣纸底 + 印章式次数字 -->
    <section class="pass">
      <div class="pass-main">
        <div class="pass-eyebrow">本次住院权益</div>
        <div class="pass-title">出院交通安排</div>
        <div class="pass-sub">出院后从医院返回家庭常住地，专车直达</div>
      </div>
      <div class="pass-seal">
        <div class="seal-num num">{{ remaining }}</div>
        <div class="seal-label">次可用</div>
      </div>
      <div class="pass-foot">
        <span><Icon name="pin" :size="13" /> 全国 331 城市</span>
        <span><Icon name="hospital" :size="13" /> 二级及以上公立医院</span>
      </div>
    </section>

    <div v-if="member.waitPeriodPassed === false" class="alert warn" style="margin-top:12px">
      <Icon name="info" :size="17" />
      <span>保单仍在等待期内，暂时无法申请本服务。等待期与主险一致。</span>
    </div>

    <!-- 进行中订单 -->
    <section v-if="order" class="card order-card" @click="router.push('/order/' + order.id)">
      <div class="oc-top">
        <span class="badge" :class="STATUS_META[order.status].tone">{{ statusText }}</span>
        <span class="tiny muted num">{{ order.id }}</span>
      </div>
      <div class="oc-route">
        <div class="r-left">
          <span class="r-dot" />
          <span class="r-line" />
          <span class="r-dot end" />
        </div>
        <div class="r-text">
          <div class="r1">{{ order.hospital.name }}</div>
          <div class="r2">{{ order.address.city }}{{ order.address.district }} · {{ order.address.community }}</div>
        </div>
      </div>
      <div class="oc-next"><Icon name="clock" :size="14" /><span>{{ nextAction }}</span></div>
      <div class="oc-date tiny muted">{{ order.travelDate }} {{ order.travelTime }} 出行</div>
    </section>

    <!-- 入口 -->
    <section class="entries">
      <button class="entry" @click="goBook">
        <span class="e-icon"><Icon name="car" :size="20" /></span>
        <span class="e-main">
          <span class="e-t">预约出院交通</span>
          <span class="e-d">{{ remaining > 0 ? '本次住院可预约 1 次' : '本次住院权益已使用' }}</span>
        </span>
        <Icon class="e-chev" name="chevron" :size="17" />
      </button>
      <button class="entry" @click="router.push('/orders')">
        <span class="e-icon"><Icon name="list" :size="20" /></span>
        <span class="e-main">
          <span class="e-t">服务记录</span>
          <span class="e-d">{{ store.orders.length ? `共 ${store.orders.length} 条` : '查看历史服务' }}</span>
        </span>
        <Icon class="e-chev" name="chevron" :size="17" />
      </button>
      <button class="entry" @click="router.push('/address')">
        <span class="e-icon"><Icon name="home" :size="20" /></span>
        <span class="e-main">
          <span class="e-t">家庭常住地</span>
          <span class="e-d">{{ store.address ? store.address.province + store.address.city + store.address.district : '尚未登记，首次预约需登记' }}</span>
        </span>
        <Icon class="e-chev" name="chevron" :size="17" />
      </button>
      <button class="entry" @click="router.push('/rules')">
        <span class="e-icon"><Icon name="book" :size="20" /></span>
        <span class="e-main">
          <span class="e-t">服务规则</span>
          <span class="e-d">申请条件、服务内容与常见问题</span>
        </span>
        <Icon class="e-chev" name="chevron" :size="17" />
      </button>
    </section>

    <div v-if="!order && remaining <= 0" class="alert warn" style="margin-top:12px">
      <Icon name="info" :size="17" />
      <span>本次住院的出院交通权益已使用，同一次住院仅提供 1 次服务。</span>
    </div>

    <div v-if="latestClosed" class="last-done" @click="router.push('/order/' + latestClosed.id)">
      <span class="tiny muted">最近一条 · {{ CLOSE_REASON[latestClosed.closeReason] || STATUS_META[latestClosed.status].label }}</span>
      <span class="tiny muted num">{{ formatDateTime(latestClosed.createdAt) }}</span>
    </div>

    <footer class="home-foot">
      <p class="tiny">本服务为非医疗类、非急救类的普通交通接送，由服务方协调属地运力提供。</p>
      <p class="tiny" style="margin-top:6px">服务时间 工作日 9:00–21:00 · 客服 95511-7</p>
    </footer>
  </div>
</template>

<style scoped>
.home { padding-top: 14px; }
.home-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 6px 2px 16px; }
.hello { font-family: var(--serif); font-size: 22px; font-weight: 700; letter-spacing: .01em; }
.pol { color: var(--ink-3); margin-top: 4px; }
.msg-btn { position: relative; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--line); background: var(--card); color: var(--ink-2); }
.msg-btn .dot { position: absolute; top: -3px; right: -3px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: var(--seal); color: #fff; font-size: 10.5px; display: grid; place-items: center; font-weight: 600; }

.pass {
  position: relative; overflow: hidden;
  background: #FBF8F1;
  border: 1px solid #E2D9C6;
  border-radius: 16px;
  padding: 18px 18px 0;
}
.pass::after {
  content: ''; position: absolute; right: -40px; top: -40px; width: 160px; height: 160px;
  border-radius: 50%; background: radial-gradient(circle, rgba(20,99,86,.07), transparent 68%);
}
.pass-eyebrow { font-size: 11.5px; letter-spacing: .08em; color: var(--brand); font-weight: 600; }
.pass-title { font-family: var(--serif); font-size: 24px; font-weight: 700; margin-top: 6px; letter-spacing: .02em; }
.pass-sub { font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }
.pass-seal {
  position: absolute; right: 16px; top: 18px;
  width: 74px; height: 74px; border-radius: 50%;
  border: 1.5px dashed rgba(179,58,43,.45);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--seal); transform: rotate(-6deg);
}
.seal-num { font-family: var(--serif); font-size: 30px; font-weight: 700; line-height: 1; }
.seal-label { font-size: 10.5px; margin-top: 2px; letter-spacing: .06em; }
.pass-foot {
  display: flex; gap: 16px; margin: 16px -18px 0; padding: 10px 18px;
  border-top: 1px dashed #E2D9C6; font-size: 11.5px; color: var(--ink-2);
  background: rgba(255,255,255,.5);
}
.pass-foot span { display: inline-flex; align-items: center; gap: 4px; }

.order-card { margin-top: 16px; padding: 16px; }
.oc-top { display: flex; align-items: center; justify-content: space-between; }
.oc-route { display: flex; gap: 10px; margin: 14px 0 10px; }
.r-left { display: flex; flex-direction: column; align-items: center; padding-top: 5px; width: 10px; }
.r-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); flex: none; }
.r-dot.end { background: transparent; border: 1.5px solid var(--ink-3); }
.r-line { flex: 1; width: 1px; background: repeating-linear-gradient(to bottom, var(--line-strong) 0 3px, transparent 3px 6px); margin: 3px 0; min-height: 18px; }
.r-text { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; }
.r1 { font-size: 14.5px; font-weight: 500; line-height: 1.35; }
.r2 { font-size: 13px; color: var(--ink-2); }
.oc-next { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--brand-deep); background: var(--brand-tint); padding: 8px 10px; border-radius: 8px; }
.oc-date { margin-top: 8px; }

.entries { margin-top: 20px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.entry { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; border-bottom: 1px solid var(--line); text-align: left; }
.entry:last-child { border-bottom: 0; }
.e-icon { width: 36px; height: 36px; border-radius: 10px; background: #F1EEE7; color: var(--ink-2); display: grid; place-items: center; flex: none; }
.e-main { flex: 1; min-width: 0; }
.e-t { display: block; font-size: 15px; font-weight: 500; }
.e-d { display: block; font-size: 12px; color: var(--ink-3); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.e-chev { color: #BFC6C8; flex: none; }

.last-done { display: flex; justify-content: space-between; padding: 16px 4px 0; }
.home-foot { padding: 26px 4px 10px; color: var(--ink-3); line-height: 1.6; }
</style>
