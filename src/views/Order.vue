<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import Countdown from '../components/Countdown.vue'
import { store } from '../store/orders.js'
import { STATUS_META, CLOSE_REASON, TIMELINE_STEPS } from '../rules/status.js'
import { formatDateTime, workHoursBetween } from '../rules/time.js'

const route = useRoute()
const router = useRouter()
const order = computed(() => store.getOrder(route.params.id))

const status = computed(() => order.value?.status)
const meta = computed(() => STATUS_META[status.value] || {})
const isClosed = computed(() => ['COMPLETED', 'CLOSED'].includes(status.value))

const showCancel = ref(false)
const cancelReason = ref('')
const cancelNote = ref('')
const cancelDone = ref(false)

const CANCEL_REASONS = [
  { value: 'plan', label: '行程有变，暂不需要' },
  { value: 'self', label: '自己安排了交通' },
  { value: 'time', label: '时间不合适' },
  { value: 'other', label: '其他原因' }
]

/* 状态主文案：现在在哪、下一步谁做什么 */
const headline = computed(() => {
  const o = order.value
  if (!o) return {}
  switch (o.status) {
    case 'REVIEWING':
      return { t: '材料审核中', d: '平台正在核验住院材料与住址证明，通过后进入派单。' }
    case 'NEED_INFO':
      return { t: '需要补充材料', d: '有一项材料不清晰，补充后将继续审核。' }
    case 'DISPATCHING':
      return { t: '正在匹配运力', d: '已向属地服务商派单，确认后将通知车辆与司机信息。' }
    case 'CONFIRMED':
      return { t: '服务已确认', d: `${o.provider?.short || '服务商'} 已接单，将提前联系确认上车地点。` }
    case 'ON_THE_WAY':
      return { t: '车辆正在前往医院', d: '司机已出发，请保持电话畅通。' }
    case 'IN_SERVICE':
      return { t: '行程进行中', d: '已接到客户，前往家庭常住地。' }
    case 'COMPLETED':
      return { t: '服务已完成', d: '行程已送达，欢迎对本次服务做出评价。' }
    case 'CLOSED':
      return {
        t: CLOSE_REASON[o.closeReason] || '已结束',
        d: o.rejectReason || o.cancelReason || '本次申请已结束，如有需要可联系客服。'
      }
    default:
      return { t: meta.value.label || '', d: '' }
  }
})

const slaDeadline = computed(() => {
  const o = order.value
  if (!o) return ''
  if (o.status === 'REVIEWING' || o.status === 'NEED_INFO') return o.sla.respondDeadline
  if (o.status === 'DISPATCHING') return o.sla.confirmDeadline
  return ''
})
const slaLabel = computed(() => (order.value?.status === 'DISPATCHING' ? '确认时效' : '响应时效'))
const slaOverdue = computed(() => slaDeadline.value && new Date(slaDeadline.value).getTime() < Date.now())

const timeline = computed(() => {
  const o = order.value
  if (!o) return []
  const done = o.timeline || []
  const doneCodes = done.map(t => t.code)
  const steps = TIMELINE_STEPS.map(s => {
    const hit = done.find(t => t.code === s.code)
    return {
      ...s,
      at: hit?.at,
      desc: hit?.desc || s.desc,
      actor: hit?.actor,
      state: hit ? (hit.level === 'doing' ? 'doing' : hit.level === 'warn' ? 'warn' : hit.level === 'danger' ? 'danger' : 'done') : 'todo'
    }
  })
  // 关闭订单：只显示实际发生过的节点
  const extra = done.filter(t => !TIMELINE_STEPS.some(s => s.code === t.code))
  return [...steps, ...extra]
})

// 展示到"最后一个已完成节点 + 下一个待办节点"，后续节点留白避免长列表
const visibleTimeline = computed(() => {
  const list = timeline.value
  const lastDone = list.reduce((acc, s, i) => (s.state !== 'todo' ? i : acc), -1)
  return list.slice(0, Math.min(list.length, lastDone + 2))
})

const canReschedule = computed(() => status.value === 'CONFIRMED')
const canCancel = computed(() => ['REVIEWING', 'DISPATCHING', 'CONFIRMED'].includes(status.value))
const cancelBlocked = computed(() => ['ON_THE_WAY', 'IN_SERVICE'].includes(status.value))

function openCancel() {
  cancelReason.value = ''
  cancelNote.value = ''
  cancelDone.value = false
  showCancel.value = true
}

function doCancel() {
  if (!cancelReason.value) return
  const o = order.value
  const label = CANCEL_REASONS.find(r => r.value === cancelReason.value)?.label || ''
  const next = {
    ...o,
    status: 'CLOSED',
    closeReason: 'CANCELLED',
    cancelReason: label + (cancelNote.value ? `：${cancelNote.value}` : ''),
    timeline: [...o.timeline, {
      code: 'CANCELLED', label: '申请已取消', desc: label,
      at: new Date().toISOString(), actor: '客户', level: 'warn'
    }]
  }
  store.updateOrder(o.id, next)
  store.pushMessage({
    type: 'system', title: '申请已取消',
    body: `受理编号 ${o.id} 的出院交通安排申请已取消。`, orderId: o.id
  })
  cancelDone.value = true
  setTimeout(() => { showCancel.value = false }, 900)
}

function callPhone() {
  window.location.href = 'tel:955117'
}

const vehicleIcon = computed(() => (order.value?.tripType === 'long' ? 'train' : 'car'))
</script>

<template>
  <div v-if="order">
    <NavBar :title="'订单详情'" back="/" />
    <div class="page with-bar" v-if="!isClosed">

      <!-- 状态主卡 -->
      <section class="status-head">
        <div class="sh-top">
          <span class="badge" :class="meta.tone">{{ meta.label }}</span>
          <span class="tiny muted num">{{ order.id }}</span>
        </div>
        <h1 class="sh-title">{{ headline.t }}</h1>
        <p class="sh-desc">{{ headline.d }}</p>

        <div v-if="slaDeadline && !slaOverdue" class="sla">
          <Countdown :deadline="slaDeadline" :label="slaLabel" />
          <div class="sla-bar"><div class="sla-fill" :style="{ width: '38%' }" /></div>
        </div>

        <div v-if="slaOverdue" class="sla-over">
          <Icon name="shield" :size="16" />
          <span>已超出承诺时效，<b>平台已介入协调</b>，将尽快给你答复</span>
        </div>
      </section>

      <!-- 待补材料 -->
      <div v-if="status === 'NEED_INFO'" class="need-card">
        <div class="nc-head"><Icon name="alert" :size="16" /><span>需重新上传</span></div>
        <div v-for="m in order.materials.filter(x => x.status === 'problem')" :key="m.type" class="nc-item">
          <div class="nc-t">{{ m.label }}</div>
          <div class="nc-r">{{ m.remark }}</div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px;width:100%" @click="router.push('/book/materials')">去补充材料</button>
      </div>

      <!-- 服务商 -->
      <section v-if="order.provider" class="card prov">
        <div class="pv-head">
          <div class="pv-logo">{{ order.provider.short.slice(0, 1) }}</div>
          <div class="pv-main">
            <div class="pv-name">{{ order.provider.name }}</div>
            <div class="pv-meta">
              <span class="rate"><Icon name="star" :size="12" /> {{ order.provider.rating }}</span>
              <span>·</span>
              <span>累计服务 {{ order.provider.orders.toLocaleString() }} 单</span>
            </div>
          </div>
          <span class="pv-level">{{ order.provider.level }} 级</span>
        </div>
        <div class="pv-tags">
          <span v-for="t in order.provider.tags" :key="t" class="pv-tag">{{ t }}</span>
        </div>

        <template v-if="order.driver">
          <div class="divider" />
          <div class="drv">
            <div class="drv-avatar">{{ order.driver.surname }}</div>
            <div class="drv-main">
              <div class="drv-name">{{ order.driver.surname }}师傅<span class="tiny muted"> · 驾龄 {{ order.driver.years }} 年</span></div>
              <div class="drv-car">{{ order.vehicle?.name }} · <span class="num">{{ order.driver.plate }}</span></div>
            </div>
            <button class="drv-call" aria-label="联系司机" @click="callPhone"><Icon name="phone" :size="17" /></button>
          </div>
        </template>
      </section>

      <!-- 行程信息 -->
      <section class="card trip">
        <div class="trip-route">
          <div class="tr-item">
            <span class="tr-dot" />
            <div>
              <div class="tr-k">出发 · 医院</div>
              <div class="tr-v">{{ order.hospital.name }}</div>
              <div class="tr-s">{{ order.hospital.city }}{{ order.hospital.district }} · {{ order.hospital.level }}</div>
            </div>
          </div>
          <div class="tr-line" />
          <div class="tr-item">
            <span class="tr-dot hollow" />
            <div>
              <div class="tr-k">到达 · 家庭常住地</div>
              <div class="tr-v">{{ order.address.city }}{{ order.address.district }}{{ order.address.community }}</div>
              <div class="tr-s">单次直达，不支持中途停靠</div>
            </div>
          </div>
        </div>

        <div class="trip-grid">
          <div><span class="k">出行时间</span><span class="v">{{ order.travelDate }} {{ order.travelTime }}</span></div>
          <div><span class="k">同行人数</span><span class="v">{{ order.passengerCount }} 人</span></div>
          <div><span class="k">{{ order.tripType === 'long' ? '票务方案' : '车型' }}</span><span class="v">{{ order.tripType === 'long' ? '火车 / 飞机 · 被保人+1家属' : (order.vehicle?.name || '按需适配') }}</span></div>
          <div><span class="k">测算里程</span><span class="v">{{ order.distanceKm }} 公里</span></div>
          <div><span class="k">联系人</span><span class="v">{{ order.contact.name }} {{ order.contact.phone }}</span></div>
          <div><span class="k">特殊需求</span><span class="v">{{ order.needs?.length ? order.needs.join('、') : '无' }}</span></div>
        </div>
      </section>

      <!-- 时间轴 -->
      <div class="section-title"><span class="t">服务进度</span><span class="s">节点全程可查</span></div>
      <section class="card tl-card">
        <div v-for="(s, i) in visibleTimeline" :key="s.code" class="tl" :class="s.state">
          <div class="tl-rail">
            <span class="tl-dot"><Icon v-if="s.state === 'done'" name="check" :size="11" /></span>
            <span v-if="i < visibleTimeline.length - 1" class="tl-line" />
          </div>
          <div class="tl-body">
            <div class="tl-row">
              <span class="tl-label">{{ s.label }}</span>
              <span v-if="s.at" class="tl-time num">{{ formatDateTime(s.at) }}</span>
            </div>
            <div class="tl-desc">{{ s.desc }}</div>
            <div v-if="s.actor" class="tl-actor">{{ s.actor }}</div>
          </div>
        </div>
      </section>

      <div class="sec-actions">
        <button v-if="canReschedule" class="row-btn" @click="router.push('/order/' + order.id + '/reschedule')">
          <Icon name="calendar" :size="17" /><span>变更出行时间</span><Icon class="chev" name="chevron" :size="16" />
        </button>
        <button v-if="canCancel || cancelBlocked" class="row-btn danger" @click="openCancel">
          <Icon name="close" :size="17" /><span>取消申请</span><Icon class="chev" name="chevron" :size="16" />
        </button>
      </div>

      <p class="tiny muted" style="margin:18px 4px 0;line-height:1.7">
        服务由平台协调属地服务商提供。如需变更或取消，请提前 4 个工作小时通知；车辆出发后请直接联系服务商。
      </p>
    </div>

    <!-- 已结束 -->
    <div class="page" v-else>
      <section class="closed-head">
        <div class="ch-icon" :class="order.status === 'COMPLETED' ? 'ok' : 'warn'">
          <Icon :name="order.status === 'COMPLETED' ? 'check' : 'info'" :size="22" />
        </div>
        <h1 class="ch-title">{{ headline.t }}</h1>
        <p class="ch-desc">{{ headline.d }}</p>
      </section>

      <div v-if="order.status === 'COMPLETED'" class="card">
        <div class="sum-row"><span>行程</span><span>{{ order.hospital.name }} → {{ order.address.city }}{{ order.address.district }}{{ order.address.community }}</span></div>
        <div class="sum-row"><span>出行时间</span><span>{{ order.travelDate }} {{ order.travelTime }}</span></div>
        <div class="sum-row"><span>服务商</span><span>{{ order.provider?.name }}</span></div>
        <div class="sum-row"><span>车辆</span><span>{{ order.vehicle?.name }}</span></div>
        <div class="sum-row" style="border-bottom:0"><span>费用</span><span class="free">权益范围内，无额外费用</span></div>
        <button v-if="!order.evaluation" class="btn btn-primary" style="margin-top:14px" @click="router.push('/order/' + order.id + '/review')">评价本次服务</button>
        <div v-else class="rated">
          <span class="stars"><Icon v-for="n in 5" :key="n" name="star" :size="14" :style="{ color: n <= order.evaluation.rating ? '#D9A03C' : '#D8D3C8' }" /></span>
          <span class="tiny muted">已评价</span>
        </div>
      </div>

      <div class="card" v-else>
        <div class="sum-row"><span>就诊医院</span><span>{{ order.hospital.name }}</span></div>
        <div class="sum-row"><span>受理编号</span><span class="num">{{ order.id }}</span></div>
        <div class="sum-row" style="border-bottom:0"><span>出行时间</span><span>{{ order.travelDate }} {{ order.travelTime }}</span></div>
      </div>

      <div class="section-title"><span class="t">服务记录</span></div>
      <section class="card tl-card">
        <div v-for="(s, i) in (order.timeline || [])" :key="i" class="tl done">
          <div class="tl-rail">
            <span class="tl-dot"><Icon name="check" :size="11" /></span>
            <span v-if="i < order.timeline.length - 1" class="tl-line" />
          </div>
          <div class="tl-body">
            <div class="tl-row">
              <span class="tl-label">{{ s.label }}</span>
              <span class="tl-time num">{{ formatDateTime(s.at) }}</span>
            </div>
            <div class="tl-desc">{{ s.desc }}</div>
          </div>
        </div>
      </section>

      <div class="sec-actions">
        <button class="row-btn" @click="router.push('/rules')">
          <Icon name="book" :size="17" /><span>查看服务规则</span><Icon class="chev" name="chevron" :size="16" />
        </button>
        <button class="row-btn" @click="callPhone">
          <Icon name="phone" :size="17" /><span>联系平台客服</span><Icon class="chev" name="chevron" :size="16" />
        </button>
      </div>
    </div>

    <!-- 底部固定条 -->
    <div class="action-bar" v-if="!isClosed">
      <button class="btn btn-ghost" style="flex:1" @click="callPhone">
        <Icon name="phone" :size="16" /> 平台客服
      </button>
      <button v-if="order.driver" class="btn btn-primary" style="flex:1.2" @click="callPhone">
        <Icon name="phone" :size="16" /> 联系司机
      </button>
      <button v-else class="btn btn-primary" style="flex:1.2" @click="router.push('/messages')">查看消息</button>
    </div>

    <!-- 取消确认 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCancel" class="mask" @click.self="showCancel = false">
          <div class="sheet">
            <template v-if="!cancelDone">
              <div class="sheet-head"><span class="t">取消申请</span><button class="close" @click="showCancel = false"><Icon name="close" :size="18" /></button></div>
              <div class="sheet-body">
                <div v-if="cancelBlocked" class="alert danger">
                  <Icon name="alert" :size="17" />
                  <span>车辆已出发，无法自助取消。如需取消请联系服务商或平台客服处理。</span>
                </div>
                <template v-else>
                  <p class="small" style="margin:0 0 12px;color:var(--ink-2)">
                    取消后本次申请将结束。若尚未出行，本次住院权益仍可重新预约一次；已确认的车辆与司机将被释放。
                  </p>
                  <div class="cancel-reasons">
                    <button v-for="r in CANCEL_REASONS" :key="r.value" class="opt" :class="{ on: cancelReason === r.value }" @click="cancelReason = r.value">
                      <span class="radio" />
                      <span class="main"><span class="l">{{ r.label }}</span></span>
                    </button>
                  </div>
                  <label class="field" style="margin-top:8px">
                    <span class="label">补充说明</span>
                    <input v-model="cancelNote" class="value" style="border:0;outline:none;background:transparent" placeholder="选填" maxlength="40" />
                  </label>
                </template>
              </div>
              <div class="sheet-foot">
                <button v-if="!cancelBlocked" class="btn btn-danger" style="width:100%" :disabled="!cancelReason" @click="doCancel">确认取消申请</button>
                <button v-else class="btn btn-primary" style="width:100%" @click="callPhone">拨打客服 95511-7</button>
              </div>
            </template>
            <div v-else class="cancel-done">
              <div class="cd-ico"><Icon name="check" :size="24" /></div>
              <p>申请已取消</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>

  <div v-else>
    <NavBar title="订单详情" back="/" />
    <div class="page">
      <div class="empty">
        <div class="t">没有找到这条记录</div>
        <div class="small">受理编号可能已失效，请回到服务记录重新进入</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:16px;display:inline-flex" @click="router.push('/orders')">查看服务记录</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-head { padding: 18px 2px 4px; }
.sh-top { display: flex; align-items: center; justify-content: space-between; }
.sh-title { font-family: var(--serif); font-size: 24px; font-weight: 700; margin: 12px 0 0; line-height: 1.25; }
.sh-desc { font-size: 13.5px; color: var(--ink-2); margin: 8px 0 0; line-height: 1.6; }
.sla { margin-top: 16px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 11px 13px; }
.sla-bar { height: 3px; background: #ECE8DE; border-radius: 2px; margin-top: 8px; overflow: hidden; }
.sla-fill { height: 100%; background: var(--brand); border-radius: 2px; }
.sla-over { display: flex; gap: 8px; margin-top: 14px; padding: 11px 13px; border-radius: 10px; background: var(--amber-tint); color: #6B4A10; font-size: 12.5px; line-height: 1.55; }
.sla-over svg { flex: none; margin-top: 1px; }

.need-card { margin-top: 14px; padding: 14px; border-radius: 12px; background: #FEFBF3; border: 1px solid #E4D3B4; }
.nc-head { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: #7A5410; }
.nc-item { margin-top: 10px; }
.nc-t { font-size: 13px; font-weight: 500; }
.nc-r { font-size: 12.5px; color: var(--ink-2); line-height: 1.55; margin-top: 2px; }

.prov { margin-top: 14px; }
.pv-head { display: flex; align-items: center; gap: 10px; }
.pv-logo { width: 40px; height: 40px; border-radius: 10px; background: var(--brand-tint); color: var(--brand-deep); display: grid; place-items: center; font-family: var(--serif); font-size: 18px; font-weight: 700; flex: none; }
.pv-main { flex: 1; min-width: 0; }
.pv-name { font-size: 14.5px; font-weight: 600; }
.pv-meta { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--ink-3); margin-top: 3px; }
.rate { display: inline-flex; align-items: center; gap: 2px; color: #A9761B; }
.pv-level { font-size: 11px; color: var(--brand-deep); background: var(--brand-tint); padding: 2px 7px; border-radius: 5px; flex: none; }
.pv-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.pv-tag { font-size: 11px; color: var(--ink-2); background: #F1EEE7; padding: 3px 8px; border-radius: 5px; }
.drv { display: flex; align-items: center; gap: 10px; }
.drv-avatar { width: 34px; height: 34px; border-radius: 50%; background: #E9E3D6; color: var(--ink-2); display: grid; place-items: center; font-size: 14px; font-weight: 600; flex: none; }
.drv-main { flex: 1; min-width: 0; }
.drv-name { font-size: 13.5px; }
.drv-car { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
.drv-call { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: #fff; display: grid; place-items: center; }

.trip { margin-top: 14px; }
.tr-item { display: flex; gap: 10px; }
.tr-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); margin-top: 6px; flex: none; }
.tr-dot.hollow { background: transparent; border: 1.5px solid var(--ink-3); }
.tr-line { width: 1px; height: 20px; background: repeating-linear-gradient(to bottom, var(--line-strong) 0 3px, transparent 3px 6px); margin-left: 3.5px; }
.tr-k { font-size: 10.5px; color: var(--ink-3); letter-spacing: .04em; }
.tr-v { font-size: 14px; font-weight: 500; line-height: 1.4; margin-top: 1px; }
.tr-s { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
.trip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--line); }
.trip-grid .k { display: block; font-size: 11px; color: var(--ink-3); }
.trip-grid .v { display: block; font-size: 13px; margin-top: 2px; line-height: 1.4; }

.tl-card { padding: 16px 16px 8px; }
.tl { display: flex; gap: 10px; }
.tl-rail { display: flex; flex-direction: column; align-items: center; width: 18px; flex: none; }
.tl-dot { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--line-strong); background: var(--card); display: grid; place-items: center; color: #fff; flex: none; margin-top: 2px; }
.tl.done .tl-dot { background: var(--brand); border-color: var(--brand); }
.tl.doing .tl-dot { border-color: var(--brand); background: var(--card); box-shadow: 0 0 0 3px var(--brand-tint); }
.tl.warn .tl-dot { border-color: var(--amber); background: var(--amber); }
.tl.danger .tl-dot { border-color: var(--seal); background: var(--seal); }
.tl-line { flex: 1; width: 1px; background: var(--line); min-height: 20px; margin: 3px 0; }
.tl.done .tl-line { background: #C6D5CF; }
.tl-body { flex: 1; padding-bottom: 16px; min-width: 0; }
.tl-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.tl-label { font-size: 13.5px; font-weight: 500; }
.tl.todo .tl-label { color: var(--ink-3); font-weight: 400; }
.tl-time { font-size: 11px; color: var(--ink-3); flex: none; }
.tl-desc { font-size: 12.5px; color: var(--ink-3); margin-top: 2px; line-height: 1.5; }
.tl-actor { font-size: 10.5px; color: #A9B2B6; margin-top: 3px; }

.sec-actions { margin-top: 20px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.row-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 15px 16px; border-bottom: 1px solid var(--line); font-size: 14px; text-align: left; }
.row-btn:last-child { border-bottom: 0; }
.row-btn .chev { margin-left: auto; color: #C3C9CB; }
.row-btn.danger { color: var(--seal); }

.closed-head { text-align: center; padding: 26px 10px 20px; }
.ch-icon { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 14px; }
.ch-icon.ok { background: var(--brand-tint); color: var(--brand); }
.ch-icon.warn { background: var(--seal-tint); color: var(--seal); }
.ch-title { font-family: var(--serif); font-size: 22px; font-weight: 700; margin: 0; }
.ch-desc { font-size: 13px; color: var(--ink-2); margin: 8px 0 0; line-height: 1.6; }
.sum-row { display: flex; justify-content: space-between; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
.sum-row span:first-child { color: var(--ink-3); flex: none; }
.sum-row span:last-child { text-align: right; }
.free { color: var(--brand-deep); font-weight: 500; }
.rated { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.stars { display: inline-flex; gap: 2px; }

.cancel-reasons { margin-top: 4px; }
.cancel-done { padding: 40px; text-align: center; }
.cd-ico { width: 52px; height: 52px; border-radius: 50%; background: var(--brand-tint); color: var(--brand); display: grid; place-items: center; margin: 0 auto 12px; }
</style>
