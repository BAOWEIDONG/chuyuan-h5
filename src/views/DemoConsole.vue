<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import { store } from '../store/orders.js'
import { SCENARIOS, loadScenario, resetAll } from '../store/demo.js'
import { seedDemoOrders } from '../store/seed.js'
import { advanceOrder, escalateOrder, rejectOrder, noVehicle, needInfo, delayDriver } from '../store/advance.js'
import { STATUS_META, CLOSE_REASON } from '../rules/status.js'
import { formatDateTime } from '../rules/time.js'

const router = useRouter()
const toast = ref('')
const tab = ref('scenario')

const orders = computed(() => store.orders)

const STEPS = {
  DRAFT: '受理申请',
  REVIEWING: '核验通过并派单',
  NEED_INFO: '材料补齐后重新送审',
  DISPATCHING: '服务商接单',
  CONFIRMED: '车辆出发前往医院',
  ON_THE_WAY: '接到客户并返程',
  IN_SERVICE: '送达并回单',
  COMPLETED: '已结束',
  CLOSED: '已结束'
}

// 只允许推进到状态机允许的下一状态，避免演示时点出非法状态
const NEXT_OK = ['REVIEWING', 'NEED_INFO', 'DISPATCHING', 'CONFIRMED', 'ON_THE_WAY', 'IN_SERVICE']

function say(m) {
  toast.value = m
  clearTimeout(say._t)
  say._t = setTimeout(() => (toast.value = ''), 2200)
}

function load(key) {
  const o = loadScenario(key)
  if (!o) return
  say(`已载入：${SCENARIOS.find(s => s.key === key).name}`)
  router.push('/order/' + o.id)
}

function advance(o) {
  const r = advanceOrder(o.id)
  say(r.ok ? `已推进至：${STATUS_META[r.status]?.label || r.status}` : r.msg)
}

function act(fn, o, msg) {
  fn(o.id)
  say(msg)
}

function statusLabel(o) {
  if (o.status === 'CLOSED') return CLOSE_REASON[o.closeReason] || '已结束'
  return STATUS_META[o.status]?.label || o.status
}

function statusTone(o) {
  if (o.status === 'CLOSED') return o.closeReason === 'REJECTED' ? 'danger' : 'muted'
  return STATUS_META[o.status]?.tone || 'muted'
}

// 一键恢复示例服务记录：覆盖当前本机订单，用于演示历史记录与评价
function loadSeed() {
  seedDemoOrders({ force: true })
  say('示例服务记录已载入（5 条）')
}

function reset() {
  resetAll()
  say('演示数据已清空')
}

const shortcuts = [
  { label: '客户 App 入口', path: '/demo/entry' },
  { label: '入口 · 等待期保单', path: '/demo/entry?persona=waiting' },
  { label: '服务首页', path: '/' },
  { label: '资格校验', path: '/eligibility' },
  { label: '预约表单', path: '/book' },
  { label: '服务记录', path: '/orders' },
  { label: '消息中心', path: '/messages' },
  { label: '服务须知', path: '/rules' }
]
</script>

<template>
  <div class="demo">
    <NavBar title="平台操作台" back="/demo/entry">
      <template #right>
        <button class="reset" @click="reset">清空数据</button>
      </template>
    </NavBar>

    <div class="wrap">
      <p class="note">
        这里模拟平台与服务商侧的操作。载入场景后点"推进"，客户端的订单详情、消息、时效提示会同步变化。
      </p>

      <div class="tabs">
        <button class="tab" :class="{ on: tab === 'scenario' }" @click="tab = 'scenario'">场景预设</button>
        <button class="tab" :class="{ on: tab === 'orders' }" @click="tab = 'orders'">当前订单 ({{ orders.length }})</button>
        <button class="tab" :class="{ on: tab === 'jump' }" @click="tab = 'jump'">页面直达</button>
      </div>

      <!-- 场景预设 -->
      <div v-if="tab === 'scenario'" class="list">
        <button class="sc seed" @click="loadSeed">
          <span class="sc-ic"><Icon name="list" :size="17" /></span>
          <div class="sc-main">
            <div class="sc-n">示例服务记录</div>
            <div class="sc-d">5 条历史订单：已评价 2 条、待评价 1 条、已取消、审核未通过</div>
          </div>
          <Icon name="chevron" :size="16" class="muted" />
        </button>
        <button v-for="s in SCENARIOS" :key="s.key" class="sc" @click="load(s.key)">
          <div class="sc-main">
            <div class="sc-n">{{ s.name }}</div>
            <div class="sc-d">{{ s.desc }}</div>
          </div>
          <Icon name="chevron" :size="16" class="muted" />
        </button>
      </div>

      <!-- 当前订单 -->
      <div v-else-if="tab === 'orders'" class="list">
        <div v-if="!orders.length" class="empty">
          <div class="t">还没有订单</div>
          <div class="small">先载入一个场景，或从客户入口走一遍完整预约</div>
        </div>

        <div v-for="o in orders" :key="o.id" class="oc">
          <div class="oc-head" @click="router.push('/order/' + o.id)">
            <span class="badge" :class="statusTone(o)">{{ statusLabel(o) }}</span>
            <span class="num tiny muted">{{ o.id }}</span>
            <Icon name="chevron" :size="14" class="muted" style="margin-left:auto" />
          </div>
          <div class="oc-body">
            <div class="oc-h">{{ o.hospital.name }}</div>
            <div class="oc-m">{{ o.address.city }}{{ o.address.district }}{{ o.address.community }} · {{ o.distanceKm }}km · {{ o.travelDate }} {{ o.travelTime }}</div>
            <div class="oc-t tiny muted">更新于 {{ formatDateTime(o.updatedAt) }}</div>
          </div>

          <div v-if="!['COMPLETED', 'CLOSED'].includes(o.status)" class="oc-acts">
            <button v-if="NEXT_OK.includes(o.status)" class="act primary" @click="advance(o)">
              推进 → {{ STEPS[o.status] }}
            </button>
            <div class="act-row">
              <button v-if="o.status === 'DISPATCHING'" class="act sm" @click="act(escalateOrder, o, '已标记超时介入')">超时介入</button>
              <button v-if="o.status === 'DISPATCHING'" class="act sm" @click="act(noVehicle, o, '已标记无车')">无车反馈</button>
              <button v-if="o.status === 'REVIEWING'" class="act sm" @click="act(needInfo, o, '已发送补材料通知')">要求补材料</button>
              <button v-if="o.status === 'REVIEWING'" class="act sm danger" @click="act(rejectOrder, o, '已驳回')">审核驳回</button>
              <button v-if="['CONFIRMED', 'ON_THE_WAY'].includes(o.status)" class="act sm" @click="act(delayDriver, o, '司机晚到 15 分钟')">司机迟到</button>
            </div>
          </div>
          <div v-else class="oc-acts">
            <button class="act sm" @click="router.push('/order/' + o.id)">查看详情</button>
          </div>
        </div>
      </div>

      <!-- 页面直达 -->
      <div v-else class="list">
        <button v-for="l in shortcuts" :key="l.path" class="sc" @click="router.push(l.path)">
          <div class="sc-main"><div class="sc-n">{{ l.label }}</div><div class="sc-d">{{ l.path }}</div></div>
          <Icon name="chevron" :size="16" class="muted" />
        </button>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.demo { min-height: 100vh; }
.wrap { padding: 12px 16px 40px; }
.note { font-size: 12.5px; line-height: 1.65; color: var(--ink-3); margin: 0 0 14px; }
.reset { font-size: 12.5px; color: var(--red); font-weight: 600; }

.tabs { display: flex; gap: 4px; background: var(--fill); padding: 4px; border-radius: 14px; margin-bottom: 14px; }
.tab { flex: 1; height: 34px; border-radius: 11px; font-size: 12.5px; color: var(--ink-2); font-weight: 500; white-space: nowrap; }
.tab.on { background: #fff; color: var(--ink); font-weight: 700; box-shadow: 0 2px 8px rgba(31, 38, 135, .08); }

.list { display: flex; flex-direction: column; gap: 9px; }
.sc {
  display: flex; align-items: center; gap: 10px; text-align: left; padding: 14px 15px;
  background: var(--card); border: 1px solid rgba(255, 255, 255, .95); border-radius: 18px;
  box-shadow: var(--shadow-sm);
}
.sc-main { flex: 1; min-width: 0; }
.sc.seed { border-color: var(--brand-line); background: var(--brand-tint); }
.sc-ic { width: 32px; height: 32px; border-radius: 10px; flex: none; display: grid; place-items: center; background: var(--grad); color: #fff; }
.sc-n { font-size: 15px; font-weight: 700; }
.sc-d { font-size: 12px; color: var(--ink-3); margin-top: 3px; line-height: 1.5; }

.oc { background: var(--card); border: 1px solid rgba(255, 255, 255, .95); border-radius: 18px; padding: 14px 15px; box-shadow: var(--shadow-sm); }
.oc-head { display: flex; align-items: center; gap: 8px; }
.oc-body { padding: 10px 0 2px; }
.oc-h { font-size: 14.5px; font-weight: 600; }
.oc-m { font-size: 12px; color: var(--ink-3); margin-top: 3px; line-height: 1.55; }
.oc-t { margin-top: 4px; }
.oc-acts { display: flex; flex-direction: column; gap: 9px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
.act-row { display: flex; flex-wrap: wrap; gap: 8px; }
.act {
  height: 38px; padding: 0 15px; border-radius: 19px; border: 1px solid var(--hairline);
  font-size: 13px; color: var(--ink-2); background: rgba(255, 255, 255, .9); font-weight: 500;
}
.act.primary {
  background: var(--grad); border-color: transparent; color: #fff; font-weight: 700; width: 100%;
  box-shadow: 0 8px 16px rgba(255, 90, 0, .22);
}
.act.sm { height: 33px; padding: 0 12px; font-size: 12.5px; border-radius: 17px; }
.act.danger { color: var(--red); border-color: rgba(226, 67, 46, .32); }

.toast {
  position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  background: rgba(28, 28, 30, .92); color: #fff; font-size: 13px;
  padding: 10px 18px; border-radius: 20px; z-index: 70; white-space: nowrap;
  backdrop-filter: blur(10px); box-shadow: 0 10px 26px rgba(0, 0, 0, .2);
}
</style>
