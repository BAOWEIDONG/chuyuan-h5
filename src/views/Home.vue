<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { session } from '../store/session.js'
import { store, activeOrder, unreadCount } from '../store/orders.js'
import { STATUS_META, CLOSE_REASON } from '../rules/status.js'
import { formatDateTime } from '../rules/time.js'

const router = useRouter()
const member = computed(() => session.member || {})
const order = computed(() => activeOrder.value)
const latestClosed = computed(() => store.orders.find(o => ['COMPLETED', 'CLOSED'].includes(o.status)))
const remaining = computed(() => member.value.remaining ?? 1)

const statusText = computed(() => (order.value ? STATUS_META[order.value.status]?.label || '' : ''))

const nextAction = computed(() => {
  const o = order.value
  if (!o) return ''
  switch (o.status) {
    case 'REVIEWING': return '材料核验中，12 个工作小时内完成'
    case 'NEED_INFO': return '有材料需要重新上传，请及时补充'
    case 'DISPATCHING': return '正在匹配属地服务商'
    case 'CONFIRMED': return `${o.travelDate} ${o.travelTime} 出行，服务商将提前联系`
    case 'ON_THE_WAY': return '车辆正在前往医院，请保持电话畅通'
    case 'IN_SERVICE': return '行程进行中'
    default: return ''
  }
})

// 家庭住址：优先取已登记的常住地，其次取进行中/最近订单里的地址
const homeAddr = computed(() => store.address || order.value?.address || null)

const guide = [
  { t: '提交出院信息', d: '医院、出院日期与家庭常住地，选择即可' },
  { t: '平台审核派单', d: '核验材料后匹配属地服务商，12 个工作小时内响应' },
  { t: '服务商联系确认', d: '提前一天确认上车地点与随行人数' },
  { t: '司机按时接送', d: '出院当天车辆到院，直达家庭常住地' }
]

const entries = computed(() => [
  { icon: 'car', t: '预约出院交通', d: remaining.value > 0 ? '本次可约 1 次' : '本次已使用', to: '/eligibility', tone: 'brand' },
  { icon: 'list', t: '服务记录', d: store.orders.length ? `共 ${store.orders.length} 条` : '暂无记录', to: '/orders', tone: 'sky' },
  { icon: 'home', t: '家庭常住地', d: homeAddr.value ? homeAddr.value.city + homeAddr.value.district : '未登记', to: '/address', tone: 'violet' },
  { icon: 'book', t: '服务规则', d: '条件与范围', to: '/rules', tone: 'green' }
])
</script>

<template>
  <div class="page home">
    <header class="home-head">
      <div class="hi">
        <div class="hi-t">你好，{{ member.memberName || '客户' }}</div>
        <div class="hi-s">保单 {{ member.policyNo }}</div>
      </div>
      <button class="msg-btn" aria-label="消息" @click="router.push('/messages')">
        <Icon name="bell" :size="19" />
        <span v-if="unreadCount" class="dot num">{{ unreadCount }}</span>
      </button>
    </header>

    <!-- 权益卡 -->
    <section class="pass">
      <div class="pass-top">
        <span class="pass-ic"><Icon name="car" :size="22" /></span>
        <div class="pass-tt">
          <div class="pass-t">出院交通安排</div>
          <div class="pass-s">出院后从医院直达家庭常住地</div>
        </div>
        <div class="pass-quota">
          <span class="pq-n num">{{ remaining }}</span>
          <span class="pq-l">次可用</span>
        </div>
      </div>
      <div class="pass-foot">
        <span><Icon name="pin" :size="13" /> 全国 331 城市</span>
        <span class="sep" />
        <span><Icon name="hospital" :size="13" /> 二级及以上公立医院</span>
      </div>
    </section>

    <div v-if="member.waitPeriodPassed === false" class="alert warn" style="margin-top:12px">
      <Icon name="info" :size="17" />
      <span>保单仍在等待期内，暂时无法申请本服务。等待期与主险一致。</span>
    </div>

    <!-- 进行中订单 -->
    <button v-if="order" class="card order-card" @click="router.push('/order/' + order.id)">
      <div class="oc-top">
        <span class="badge" :class="STATUS_META[order.status].tone">{{ statusText }}</span>
        <span class="oc-id num">{{ order.id }}</span>
        <Icon class="oc-go" name="chevron" :size="17" />
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
      <div class="oc-date num">{{ order.travelDate }} {{ order.travelTime }} 出行</div>
    </button>

    <!-- 功能入口：2×2 磁贴 -->
    <section class="tiles">
      <button v-for="e in entries" :key="e.to" class="tile" @click="router.push(e.to)">
        <span class="tile-ic" :class="e.tone"><Icon :name="e.icon" :size="19" /></span>
        <span class="tile-t">{{ e.t }}</span>
        <span class="tile-d">{{ e.d }}</span>
      </button>
    </section>

    <div v-if="!order && remaining <= 0" class="alert warn" style="margin-top:14px">
      <Icon name="info" :size="17" />
      <span>本次住院的出院交通权益已使用，同一次住院仅提供 1 次服务。</span>
    </div>

    <!-- 尚未预约：把流程铺出来，避免下半屏空着 -->
    <section v-if="!order" class="guide">
      <div class="gd-h">
        <span class="gd-t">怎么用</span>
        <span class="gd-s">4 步完成，全程可查进度</span>
      </div>
      <ol class="gd-list">
        <li v-for="(g, i) in guide" :key="g.t">
          <span class="gd-n num">{{ i + 1 }}</span>
          <span class="gd-b">
            <span class="gd-tt">{{ g.t }}</span>
            <span class="gd-d">{{ g.d }}</span>
          </span>
        </li>
      </ol>
    </section>

    <button v-if="latestClosed" class="last-done" @click="router.push('/order/' + latestClosed.id)">
      <span class="ld-l">
        <Icon name="check" :size="14" />
        最近一条 · {{ CLOSE_REASON[latestClosed.closeReason] || STATUS_META[latestClosed.status].label }}
      </span>
      <span class="ld-r num">{{ formatDateTime(latestClosed.createdAt) }}</span>
    </button>

    <footer class="home-foot">
      <p>本服务为非医疗类、非急救类的普通交通接送，由服务方协调属地运力提供。</p>
      <p class="num">服务时间 工作日 9:00–21:00 · 客服 400-820-8866</p>
    </footer>
  </div>
</template>

<style scoped>
.home { padding-top: 10px; }
.home-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 2px 18px; }
.hi-t { font-size: 21px; font-weight: 800; letter-spacing: .4px; }
.hi-s { font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }
.msg-btn {
  position: relative; width: 38px; height: 38px; border-radius: 50%;
  display: grid; place-items: center; color: var(--ink-2);
  background: rgba(255, 255, 255, .92); border: 1px solid rgba(255, 255, 255, .95);
  box-shadow: var(--shadow-sm);
}
.msg-btn .dot {
  position: absolute; top: -2px; right: -2px; min-width: 17px; height: 17px; padding: 0 4px;
  border-radius: 9px; background: var(--red); color: #fff; font-size: 10.5px;
  display: grid; place-items: center; font-weight: 700; border: 1.5px solid #fff;
}

/* 权益卡：白色玻璃 + 一处橙色渐变图标，整体克制 */
.pass {
  position: relative; overflow: hidden;
  background: var(--card);
  backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid rgba(255, 255, 255, .96);
  border-radius: 24px;
  box-shadow: var(--shadow);
  padding: 18px 18px 0;
}
.pass::after {
  content: ''; position: absolute; right: -46px; top: -56px; width: 168px; height: 168px;
  border-radius: 50%; background: radial-gradient(circle, rgba(255, 122, 31, .13), transparent 68%);
  pointer-events: none;
}
.pass-top { display: flex; align-items: center; gap: 12px; position: relative; }
.pass-ic {
  width: 46px; height: 46px; border-radius: 15px; flex: none;
  background: var(--grad); color: #fff; display: grid; place-items: center;
  box-shadow: 0 8px 16px rgba(255, 90, 0, .26), inset 0 1px 1px rgba(255, 255, 255, .45);
}
.pass-tt { flex: 1; min-width: 0; }
.pass-t { font-size: 18px; font-weight: 800; letter-spacing: .2px; }
.pass-s { font-size: 12.5px; color: var(--ink-3); margin-top: 3px; }
.pass-quota { display: flex; align-items: baseline; gap: 3px; flex: none; }
.pq-n {
  font-size: 32px; font-weight: 800; line-height: 1;
  background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.pq-l { font-size: 11.5px; color: var(--ink-3); }
.pass-foot {
  display: flex; align-items: center; gap: 10px; margin: 15px -18px 0; padding: 11px 18px;
  border-top: 1px solid rgba(60, 60, 67, .06); background: rgba(255, 255, 255, .5);
  font-size: 11.5px; color: var(--ink-2);
}
.pass-foot span { display: inline-flex; align-items: center; gap: 4px; }
.pass-foot svg { color: var(--brand); }
.pass-foot .sep { width: 1px; height: 10px; background: var(--hairline); }

.order-card {
  display: block; width: 100%; text-align: left; margin-top: 14px; padding: 15px 16px 16px;
  border-radius: 22px;
}
.order-card:active { transform: scale(.992); }
.oc-top { display: flex; align-items: center; gap: 8px; }
.oc-id { font-size: 11px; color: var(--ink-3); }
.oc-go { margin-left: auto; color: rgba(60, 60, 67, .26); }
.oc-route { display: flex; gap: 10px; margin: 14px 0 12px; }
.r-left { display: flex; flex-direction: column; align-items: center; padding-top: 5px; width: 10px; }
.r-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); flex: none; }
.r-dot.end { background: transparent; border: 1.5px solid rgba(60, 60, 67, .3); }
.r-line { flex: 1; width: 1px; background: repeating-linear-gradient(to bottom, rgba(60,60,67,.2) 0 3px, transparent 3px 6px); margin: 3px 0; min-height: 18px; }
.r-text { flex: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.r1 { font-size: 15px; font-weight: 600; line-height: 1.35; }
.r2 { font-size: 13px; color: var(--ink-2); }
.oc-next {
  display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--brand-ink);
  background: var(--brand-tint); padding: 9px 11px; border-radius: 11px; line-height: 1.4;
}
.oc-next svg { flex: none; }
.oc-date { font-size: 11.5px; color: var(--ink-3); margin-top: 9px; padding-left: 2px; }

/* 2×2 磁贴 */
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-top: 18px; }
.tile {
  text-align: left; padding: 15px 14px 14px; border-radius: 20px;
  background: var(--card); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid rgba(255, 255, 255, .95); box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; transition: transform .15s ease;
}
.tile:active { transform: scale(.97); }
.tile-ic {
  width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; color: #fff;
  margin-bottom: 11px; box-shadow: 0 6px 14px rgba(31, 38, 135, .14), inset 0 1px 1px rgba(255, 255, 255, .4);
}
.tile-ic.brand { background: var(--grad); box-shadow: 0 6px 14px rgba(255, 90, 0, .24), inset 0 1px 1px rgba(255, 255, 255, .4); }
.tile-ic.sky { background: var(--grad-sky); }
.tile-ic.violet { background: linear-gradient(135deg, #9A8CF7, #6B4FD8); }
.tile-ic.green { background: linear-gradient(135deg, #3FD58A, #0FA35B); }
.tile-t { font-size: 15px; font-weight: 700; }
.tile-d { font-size: 11.5px; color: var(--ink-3); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.guide { margin-top: 20px; padding: 16px 16px 6px; border-radius: 20px; background: rgba(255,255,255,.66); border: 1px solid rgba(255,255,255,.9); }
.gd-h { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
.gd-t { font-size: 14px; font-weight: 800; }
.gd-s { font-size: 11.5px; color: var(--ink-3); }
.gd-list { list-style: none; margin: 0; padding: 0; }
.gd-list li { display: flex; gap: 11px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.gd-list li:last-child { border-bottom: 0; }
.gd-n {
  width: 22px; height: 22px; border-radius: 8px; flex: none; margin-top: 1px;
  background: var(--brand-tint); color: var(--brand-ink); border: 1px solid var(--brand-line);
  display: grid; place-items: center; font-size: 11px; font-weight: 800;
}
.gd-b { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.gd-tt { font-size: 13.5px; font-weight: 600; }
.gd-d { font-size: 11.5px; color: var(--ink-3); line-height: 1.5; }
.last-done {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  margin-top: 16px; padding: 13px 15px; border-radius: 16px;
  background: rgba(255, 255, 255, .68); border: 1px solid rgba(255, 255, 255, .9);
  font-size: 11.5px; color: var(--ink-3);
}
.ld-l { display: inline-flex; align-items: center; gap: 5px; }
.ld-l svg { color: var(--green); }

.home-foot { padding: 26px 4px 8px; font-size: 11.5px; color: var(--ink-3); line-height: 1.7; }
.home-foot p { margin: 0 0 4px; }
</style>
