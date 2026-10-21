<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import Countdown from '../components/Countdown.vue'
import { store } from '../store/orders.js'
import { STATUS_META, CLOSE_REASON, TIMELINE_STEPS } from '../rules/status.js'
import { formatDateTime, workHoursBetween } from '../rules/time.js'
import { RATING_TEXT, tagLabel } from '../rules/review.js'

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
      return {
        t: '服务已完成',
        d: o.evaluation && !o.evaluation.skipped
          ? '行程已送达，感谢你的评价与反馈。'
          : o.evaluation
            ? '行程已送达，你已跳过本次评价，仍可随时补充。'
            : '行程已送达，欢迎对本次服务做出评价。'
      }
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
  // 与行程强相关的节点补充具体信息，避免只写一句"已确认"
  const detail = (code) => {
    if (code === 'REMINDED') return `${o.travelDate} ${o.travelTime} 到医院门口接，已确认上车地点与随行人数`
    if (code === 'DEPARTED') return `司机已从停车场出发，预计 ${o.travelTime} 前到达医院`
    if (code === 'PICKED') return `已办完出院手续，${o.passengerCount} 人上车，行李 ${o.luggage} 件`
    if (code === 'ARRIVED') return `已到达${o.address.city}${o.address.district}${o.address.community}，全程 ${o.distanceKm} 公里`
    return null
  }
  const steps = TIMELINE_STEPS.map(s => {
    const hit = done.find(t => t.code === s.code)
    return {
      ...s,
      at: hit?.at,
      desc: (hit && detail(s.code)) || hit?.desc || s.desc,
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

// 车辆/司机信息从"服务确认"开始对客户可见；行前提醒时再加强调
const showCrew = computed(() => {
  const s = status.value
  return !!order.value?.driver && ['CONFIRMED', 'ON_THE_WAY', 'IN_SERVICE', 'COMPLETED'].includes(s)
})
const crewActive = computed(() => ['ON_THE_WAY', 'IN_SERVICE'].includes(status.value))

// 车辆与司机卡片只挂在"最近一次与车辆相关"的节点上，避免同一屏重复出现
const crewNodeCode = computed(() => {
  if (!showCrew.value) return ''
  const hit = [...(order.value?.timeline || [])]
    .filter(t => ['CONFIRMED', 'REMINDED', 'DEPARTED'].includes(t.code))
    .pop()
  return hit?.code || ''
})
function nodeCrew(code) {
  return code === crewNodeCode.value
}

const vehicleIcon = computed(() => (order.value?.tripType === 'long' ? 'train' : 'car'))

// 已结束订单的车型文案：完成单给真实车型，未成行的单明确写"未派车"，不用"按需适配"这种含糊说法
const closedVehicleText = computed(() => {
  const o = order.value
  if (!o) return ''
  if (o.status !== 'COMPLETED') return '未派车'
  if (o.tripType === 'long') return '火车 / 飞机 · 被保人+1家属'
  return o.vehicle?.name || '按需适配'
})
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
            <a class="drv-call" href="tel:4008208866" aria-label="联系司机"><Icon name="phone" :size="17" /></a>
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
          <div><span class="k">同行人</span><span class="v">{{ order.contact.name }} {{ order.contact.phone }}</span></div>
          <div><span class="k">特殊需求</span><span class="v">{{ order.needs?.length ? order.needs.join('、') : '无' }}</span></div>
          <div><span class="k">受理时间</span><span class="v">{{ formatDateTime(order.createdAt) }}</span></div>
          <div><span class="k">费用</span><span class="v free">权益范围内，无额外费用</span></div>
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

            <!-- 车辆与司机：服务确认/车辆出发节点直接带出，客户不用再去别处找 -->
            <div v-if="nodeCrew(s.code) && s.state !== 'todo'" class="crew" :class="{ live: crewActive }">
              <div class="crew-top">
                <span class="crew-veh"><Icon :name="vehicleIcon" :size="16" /></span>
                <span class="crew-main">
                  <span class="crew-plate num">{{ order.driver.plate }}</span>
                  <span class="crew-model">{{ order.vehicle?.name }}</span>
                </span>
                <span v-if="crewActive" class="crew-live"><i />实时</span>
              </div>
              <div class="crew-drv">
                <span class="cd-avatar">{{ order.driver.surname }}</span>
                <span class="cd-main">
                  <span class="cd-name">{{ order.driver.surname }}师傅<span class="cd-y">驾龄 {{ order.driver.years }} 年</span></span>
                  <span class="cd-cert">持证上岗 · 已通过平台背景核验</span>
                </span>
                <a class="cd-call" href="tel:4008208866">
                  <Icon name="phone" :size="13" />联系司机
                </a>
              </div>
              <p class="crew-tip">号码已做隐私保护，点击由平台中转拨号</p>
            </div>

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

    <!-- 已结束：与进行中保持同一套信息结构，不删字段 -->
    <div class="page" v-else>
      <section class="status-head">
        <div class="sh-top">
          <span class="badge" :class="meta.tone">{{ meta.label }}</span>
          <span class="tiny muted num">{{ order.id }}</span>
        </div>
        <div class="ch-icon" :class="order.status === 'COMPLETED' ? 'ok' : 'warn'">
          <Icon :name="order.status === 'COMPLETED' ? 'check' : 'info'" :size="20" />
        </div>
        <h1 class="sh-title">{{ headline.t }}</h1>
        <p class="sh-desc">{{ headline.d }}</p>
      </section>

      <!-- 服务商（已结束同样展示，便于回溯是哪家提供的服务） -->
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
          </div>
        </template>
      </section>

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
          <div><span class="k">{{ order.tripType === 'long' ? '票务方案' : '车型' }}</span><span class="v">{{ closedVehicleText }}</span></div>
          <div><span class="k">测算里程</span><span class="v">{{ order.distanceKm }} 公里</span></div>
          <div><span class="k">同行人</span><span class="v">{{ order.contact.name }} {{ order.contact.phone }}</span></div>
          <div><span class="k">特殊需求</span><span class="v">{{ order.needs?.length ? order.needs.join('、') : '无' }}</span></div>
          <div><span class="k">受理时间</span><span class="v">{{ formatDateTime(order.createdAt) }}</span></div>
          <div><span class="k">{{ order.status === 'COMPLETED' ? '完成时间' : '结束时间' }}</span><span class="v">{{ formatDateTime(order.timeline?.[order.timeline.length - 1]?.at) }}</span></div>
          <div class="full"><span class="k">费用</span><span class="v" :class="{ free: order.status === 'COMPLETED' }">{{ order.status === 'COMPLETED' ? '权益范围内，无额外费用' : '未产生费用，本次住院权益未使用' }}</span></div>
        </div>
      </section>

      <!-- 评价 -->
      <div v-if="order.status === 'COMPLETED'" class="card eval-card">
        <template v-if="!order.evaluation">
          <div class="ec-head">
            <span class="ec-t">本次服务还没有评价</span>
            <span class="ec-d">你的反馈会同步给服务商与平台</span>
          </div>
          <button class="btn btn-primary" style="margin-top:12px" @click="router.push('/order/' + order.id + '/review')">评价本次服务</button>
        </template>
        <template v-else-if="order.evaluation.skipped">
          <div class="rated" style="justify-content:space-between;margin-top:0">
            <span class="tiny muted">你已跳过本次评价</span>
            <button class="rate-later" @click="router.push('/order/' + order.id + '/review')">补评价</button>
          </div>
        </template>
        <div v-else class="eval" style="margin-top:0">
          <div class="ev-head">
            <span class="ev-l">我的评价</span>
            <span class="stars">
              <Icon v-for="n in 5" :key="n" name="star" :size="14" :fill="n <= order.evaluation.rating"
                :style="{ color: n <= order.evaluation.rating ? '#FF8A1F' : 'rgba(60,60,67,.22)' }" />
            </span>
            <span class="ev-t">{{ RATING_TEXT[order.evaluation.rating] }}</span>
          </div>
          <div v-if="order.evaluation.tags?.length" class="ev-tags">
            <span v-for="t in order.evaluation.tags" :key="t" class="ev-tag">{{ tagLabel(t) }}</span>
          </div>
          <p v-if="order.evaluation.note" class="ev-note">{{ order.evaluation.note }}</p>
          <div class="ev-time tiny muted num">{{ formatDateTime(order.evaluation.at) }}</div>
        </div>
      </div>

      <div class="section-title"><span class="t">服务进度</span><span class="s">共 {{ order.timeline?.length || 0 }} 个节点</span></div>
      <section class="card tl-card">
        <div v-for="(s, i) in (order.timeline || [])" :key="i" class="tl" :class="s.level === 'danger' ? 'danger' : s.level === 'warn' ? 'warn' : 'done'">
          <div class="tl-rail">
            <span class="tl-dot" :class="s.level">
              <Icon v-if="s.level !== 'danger' && s.level !== 'warn'" name="check" :size="11" />
              <Icon v-else :size="11" :name="s.level === 'danger' ? 'close' : 'alert'" />
            </span>
            <span v-if="i < order.timeline.length - 1" class="tl-line" />
          </div>
          <div class="tl-body">
            <div class="tl-row">
              <span class="tl-label">{{ s.label }}</span>
              <span class="tl-time num">{{ formatDateTime(s.at) }}</span>
            </div>
            <div class="tl-desc">{{ s.desc }}</div>

            <div v-if="nodeCrew(s.code)" class="crew">
              <div class="crew-top">
                <span class="crew-veh"><Icon :name="vehicleIcon" :size="16" /></span>
                <span class="crew-main">
                  <span class="crew-plate num">{{ order.driver.plate }}</span>
                  <span class="crew-model">{{ order.vehicle?.name }}</span>
                </span>
              </div>
              <div class="crew-drv">
                <span class="cd-avatar">{{ order.driver.surname }}</span>
                <span class="cd-main">
                  <span class="cd-name">{{ order.driver.surname }}师傅<span class="cd-y">驾龄 {{ order.driver.years }} 年</span></span>
                  <span class="cd-cert">持证上岗 · 已通过平台背景核验</span>
                </span>
              </div>
            </div>

            <div v-if="s.actor" class="tl-actor">{{ s.actor }}</div>
          </div>
        </div>
      </section>

      <div class="sec-actions">
        <button class="row-btn" @click="router.push('/rules')">
          <Icon name="book" :size="17" /><span>查看服务规则</span><Icon class="chev" name="chevron" :size="16" />
        </button>
        <a class="row-btn" href="tel:4008208866">
          <Icon name="phone" :size="17" /><span>联系平台客服 400-820-8866</span><Icon class="chev" name="chevron" :size="16" />
        </a>
      </div>
    </div>

    <!-- 底部固定条 -->
    <div class="action-bar" v-if="!isClosed">
      <a class="btn btn-ghost" style="flex:1" href="tel:4008208866">
        <Icon name="phone" :size="16" /> 平台客服
      </a>
      <a v-if="order.driver" class="btn btn-primary" style="flex:1.2" href="tel:4008208866">
        <Icon name="phone" :size="16" /> 联系司机
      </a>
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
                  <span>车辆已出发，无法自助取消。如需取消请联系服务商，或拨打 <a class="inl-tel" href="tel:4008208866">400-820-8866</a>。</span>
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
                <a v-else class="btn btn-primary" style="width:100%" href="tel:4008208866">拨打客服 400-820-8866</a>
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
.status-head { padding: 14px 2px 4px; }
.sh-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sh-title { font-size: 26px; font-weight: 800; margin: 12px 0 0; line-height: 1.25; letter-spacing: .2px; }
.sh-desc { font-size: 13.5px; color: var(--ink-2); margin: 8px 0 0; line-height: 1.65; }

.sla { margin-top: 16px; padding: 13px 15px; border-radius: 16px; background: rgba(255, 255, 255, .82); border: 1px solid rgba(255, 255, 255, .95); box-shadow: var(--shadow-sm); }
.sla-bar { height: 5px; background: var(--fill-2); border-radius: 3px; margin-top: 9px; overflow: hidden; }
.sla-fill { height: 100%; background: var(--grad); border-radius: 3px; }
.sla-over { display: flex; gap: 8px; margin-top: 12px; padding: 12px 14px; border-radius: 14px; background: var(--amber-tint); color: #8A5600; font-size: 12.5px; line-height: 1.6; }
.sla-over svg { flex: none; margin-top: 1px; }

.need-card { margin-top: 14px; padding: 15px; border-radius: 18px; background: rgba(255, 249, 240, .95); border: 1px solid rgba(255, 196, 130, .7); }
.nc-head { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; color: #8A5600; }
.nc-item { margin-top: 10px; }
.nc-t { font-size: 13.5px; font-weight: 600; }
.nc-r { font-size: 12.5px; color: var(--ink-2); line-height: 1.6; margin-top: 3px; }

.prov { margin-top: 14px; }
.pv-head { display: flex; align-items: center; gap: 11px; }
.pv-logo {
  width: 44px; height: 44px; border-radius: 14px; flex: none;
  background: var(--grad); color: #fff; display: grid; place-items: center;
  font-size: 17px; font-weight: 800;
  box-shadow: 0 8px 16px rgba(255, 90, 0, .22), inset 0 1px 1px rgba(255, 255, 255, .4);
}
.pv-main { flex: 1; min-width: 0; }
.pv-name { font-size: 15px; font-weight: 700; }
.pv-meta { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--ink-3); margin-top: 4px; }
.rate { display: inline-flex; align-items: center; gap: 2px; color: #C77800; font-weight: 600; }
.pv-level { font-size: 11px; color: var(--green-deep); background: var(--green-tint); padding: 2px 8px; border-radius: 7px; flex: none; font-weight: 600; }
.pv-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 13px; }
.pv-tag { font-size: 11px; color: var(--ink-2); background: var(--fill); padding: 4px 9px; border-radius: 8px; }
.drv { display: flex; align-items: center; gap: 11px; }
.drv-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--grad-sky); color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 700; flex: none; }
.drv-main { flex: 1; min-width: 0; }
.drv-name { font-size: 14px; font-weight: 600; }
.drv-car { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
.drv-call { text-decoration: none;
  width: 38px; height: 38px; border-radius: 50%; background: var(--grad); color: #fff; display: grid; place-items: center;
  box-shadow: 0 6px 14px rgba(255, 90, 0, .26);
}

.trip { margin-top: 14px; }
.tr-item { display: flex; gap: 11px; }
.tr-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--grad); margin-top: 6px; flex: none; box-shadow: 0 0 0 3px var(--brand-tint); }
.tr-dot.hollow { background: #fff; border: 1.5px solid rgba(60, 60, 67, .28); box-shadow: 0 0 0 3px var(--fill); }
.tr-line { width: 1px; height: 20px; background: repeating-linear-gradient(to bottom, rgba(60,60,67,.22) 0 3px, transparent 3px 6px); margin-left: 4px; }
.tr-k { font-size: 10.5px; color: var(--ink-3); letter-spacing: .04em; }
.tr-v { font-size: 14.5px; font-weight: 600; line-height: 1.4; margin-top: 1px; }
.tr-s { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
.trip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px 14px; margin-top: 16px; padding-top: 15px; border-top: 1px solid var(--line); }
.trip-grid .k { display: block; font-size: 11px; color: var(--ink-3); }
.trip-grid .full { grid-column: 1 / -1; }
.trip-grid .v { display: block; font-size: 13.5px; margin-top: 3px; line-height: 1.4; font-weight: 500; }

.tl-card { padding: 18px 16px 6px; }
.tl { display: flex; gap: 11px; }
.tl-rail { display: flex; flex-direction: column; align-items: center; width: 20px; flex: none; }
.tl-dot {
  width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid rgba(60, 60, 67, .18);
  background: #fff; display: grid; place-items: center; color: #fff; flex: none; margin-top: 1px;
}
.tl.done .tl-dot { background: var(--grad); border-color: transparent; box-shadow: 0 3px 8px rgba(255, 90, 0, .22); }
.tl.doing .tl-dot { border-color: var(--brand); background: #fff; box-shadow: 0 0 0 4px var(--brand-tint); }
.tl.doing .tl-dot::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--grad); }
.tl.warn .tl-dot { border-color: transparent; background: var(--amber); }
.tl.danger .tl-dot { border-color: transparent; background: var(--red); }
.tl.danger .tl-dot, .tl.warn .tl-dot { color: #fff; }
.tl.danger .tl-label { color: var(--red); }
.tl-line { flex: 1; width: 1.5px; background: var(--line); min-height: 18px; margin: 3px 0; }
.tl.done .tl-line { background: rgba(255, 122, 31, .3); }
.tl-dot.warn { background: var(--amber); border-color: transparent; color: #fff; }
.tl-dot.danger { background: var(--red); border-color: transparent; color: #fff; }
.tl.warn .tl-label { color: var(--amber); }
.tl-body { flex: 1; padding-bottom: 17px; min-width: 0; }
.tl-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.tl-label { font-size: 14px; font-weight: 600; }
.tl.todo .tl-label { color: var(--ink-3); font-weight: 400; }
.tl-time { font-size: 11px; color: var(--ink-3); flex: none; }
.tl-desc { font-size: 12.5px; color: var(--ink-3); margin-top: 3px; line-height: 1.55; }
.tl-actor { font-size: 10.5px; color: rgba(60, 60, 67, .32); margin-top: 3px; }

/* 时间轴内嵌的车辆 / 司机卡 */
.crew {
  margin: 10px 0 4px; padding: 11px 12px 9px; border-radius: 14px;
  background: rgba(255, 255, 255, .8); border: 1px solid rgba(60, 60, 67, .08);
}
.crew.live { background: var(--brand-tint); border-color: var(--brand-line); }
.crew-top { display: flex; align-items: center; gap: 9px; padding-bottom: 10px; border-bottom: 1px dashed rgba(60, 60, 67, .12); }
.crew-veh {
  width: 30px; height: 30px; border-radius: 10px; flex: none; display: grid; place-items: center;
  background: var(--grad-sky); color: #fff;
}
.crew-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.crew-plate { font-size: 14px; font-weight: 800; letter-spacing: .5px; }
.crew-model { font-size: 11.5px; color: var(--ink-3); }
.crew-live {
  margin-left: auto; display: inline-flex; align-items: center; gap: 4px; flex: none;
  font-size: 10.5px; font-weight: 700; color: var(--green); background: var(--green-tint);
  padding: 3px 8px; border-radius: 9px;
}
.crew-live i { width: 5px; height: 5px; border-radius: 50%; background: var(--green); }
.crew-drv { display: flex; align-items: center; gap: 9px; padding-top: 9px; }
.cd-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex: none; display: grid; place-items: center;
  background: var(--grad-sky); color: #fff; font-size: 12px; font-weight: 700;
}
.cd-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cd-name { font-size: 13px; font-weight: 600; }
.cd-y { font-size: 11px; color: var(--ink-3); font-weight: 400; margin-left: 5px; }
.cd-cert { font-size: 10.5px; color: var(--ink-3); }
.cd-call {
  margin-left: auto; flex: none; display: inline-flex; align-items: center; gap: 4px;
  height: 30px; padding: 0 11px; border-radius: 15px; font-size: 12px; font-weight: 600;
  color: var(--brand-ink); background: #fff; border: 1px solid var(--brand-line);
  box-shadow: 0 3px 8px rgba(255, 102, 0, .1);
}
.crew-tip { font-size: 10px; color: var(--ink-3); margin: 8px 0 0; }

.sec-actions { margin-top: 18px; background: var(--card); border: 1px solid rgba(255, 255, 255, .95); border-radius: 20px; overflow: hidden; box-shadow: var(--shadow-sm); }
.row-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 16px; border-bottom: 1px solid var(--line); font-size: 14.5px; text-align: left; font-weight: 500; }
.row-btn:last-child { border-bottom: 0; }
.row-btn .chev { margin-left: auto; color: rgba(60, 60, 67, .26); }
.row-btn.danger { color: var(--red); }

.closed-head { text-align: center; padding: 26px 10px 18px; }
/* 已结束页的状态区：与进行中同宽，图标居中放在标题上方 */
.status-head .ch-icon { margin-top: 16px; margin-bottom: 0; }
.status-head .ch-title { font-size: 26px; margin-top: 12px; }
.ch-icon { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 15px; }
.ch-icon.ok { background: var(--green-tint); color: var(--green); }
.ch-icon.warn { background: var(--red-tint); color: var(--red); }
.ch-title { font-size: 22px; font-weight: 800; margin: 0; }
.ch-desc { font-size: 13px; color: var(--ink-2); margin: 9px 0 0; line-height: 1.65; }
.sum-row { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
.sum-row:last-child { border-bottom: 0; }
.sum-row span:first-child { color: var(--ink-3); flex: none; }
.sum-row span:last-child { text-align: right; font-weight: 500; }
.free { color: var(--green-deep); font-weight: 600; }
.rated { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.stars { display: inline-flex; gap: 2px; }

.cancel-reasons { margin-top: 4px; }
.cancel-done { padding: 40px; text-align: center; }
.cd-ico { width: 56px; height: 56px; border-radius: 50%; background: var(--green-tint); color: var(--green); display: grid; place-items: center; margin: 0 auto 12px; }

.eval-card { margin-top: 12px; }
.ec-head { display: flex; flex-direction: column; gap: 4px; }
.ec-t { font-size: 14px; font-weight: 700; }
.ec-d { font-size: 12px; color: var(--ink-3); }
.eval { margin-top: 14px; padding: 13px 14px; border-radius: 16px; background: var(--brand-tint); border: 1px solid var(--brand-line); }
.ev-head { display: flex; align-items: center; gap: 8px; }
.ev-l { font-size: 13px; font-weight: 700; color: var(--brand-ink); }
.stars { display: inline-flex; gap: 1px; }
.ev-t { font-size: 12px; color: var(--brand-ink); font-weight: 600; margin-left: auto; }
.ev-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.ev-tag { font-size: 11.5px; color: var(--brand-ink); background: rgba(255, 255, 255, .8); border: 1px solid var(--brand-line); padding: 3px 9px; border-radius: 10px; }
.ev-note { font-size: 12.5px; color: var(--ink-2); line-height: 1.65; margin: 10px 0 0; }
.ev-time { margin-top: 8px; }
.rate-later { font-size: 12px; color: var(--brand-ink); font-weight: 600; padding: 4px 2px; }

/* 说明文字里的电话号码：可点直拨 */
.inl-tel { color: var(--brand-ink); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
</style>
