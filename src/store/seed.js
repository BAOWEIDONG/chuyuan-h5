// 服务记录的示例数据：首次打开或示例版本升级时写入
// 用于展示「进行中的订单状态跟踪 + 已完成的评价」
import { store } from './orders.js'
import { PROVIDERS, plateForCity } from '../data/providers.js'

const KEY = 'cy_orders'
const VER_KEY = 'cy_seed_v'

// 示例数据版本：内容有更新就把版本号 +1，老用户下次打开会自动换成新示例，
// 但自己走流程生成的订单会保留
export const SEED_VERSION = 2

// 直接写死示例医院信息，避免把整份医院库（260KB）拉进首屏包
const HOSPITAL_INDEX = {
  '中国科学技术大学附属第一医院（安徽省立医院）': { id: 'H0002', city: '合肥', district: '庐阳区', level: '三级甲等', nature: '公立' },
  '安徽医科大学第一附属医院': { id: 'H0001', city: '合肥', district: '蜀山区', level: '三级甲等', nature: '公立' },
  '合肥市第一人民医院': { id: 'H0003', city: '合肥', district: '庐阳区', level: '三级甲等', nature: '公立' },
  '合肥康民社区卫生服务中心': { id: 'H0005', city: '合肥', district: '庐江县', level: '一级', nature: '公立' }
}

const ADDR_HEFEI = { province: '安徽', city: '合肥', district: '蜀山区', community: '万科城', detail: '', proofType: 'house', label: '房产证 / 购房合同' }

function hospital(name) {
  return { name, ...(HOSPITAL_INDEX[name] || { id: 'H0001', city: '合肥', district: '蜀山区', level: '三级甲等', nature: '公立' }) }
}

function provider(id) {
  const p = PROVIDERS.find(x => x.id === id) || PROVIDERS[0]
  return { id: p.id, name: p.name, short: p.short, level: p.level, rating: p.rating, orders: p.orders, tags: p.tags }
}

/* ---------- 相对时间：示例数据永远"跟着今天走"，不会放几个月就过期 ---------- */
const DAY = 86400000
function dayOffset(days, hh = 10, mm = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hh, mm, 0, 0)
  return d
}
function iso(d) { return d.toISOString() }
function minutesBefore(d, m) { return iso(new Date(d.getTime() - m * 60000)) }
function ymdOf(d) {
  const p = n => (n < 10 ? '0' + n : String(n))
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 订单号按日期生成，跟真实受理编号的样子一致
function orderId(date, seq) {
  const p = n => (n < 10 ? '0' + n : String(n))
  return `CY${String(date.getFullYear()).slice(2)}${p(date.getMonth() + 1)}${p(date.getDate())}${seq}`
}

function base(over) {
  return {
    memberId: 'M0001',
    memberName: '陈**',
    closeReason: '',
    cancelReason: '',
    rejectReason: '',
    materials: [
      { type: 'hospital', label: '住院材料', files: [{ name: '出院小结.jpg', size: 820 }], status: 'ok' },
      { type: 'address', label: '住址证明', files: [{ name: '房产证.jpg', size: 640 }], status: 'ok' },
      { type: 'doctor', label: '平躺医嘱', files: [], status: 'na' }
    ],
    luggage: 2,
    tripType: 'short',
    vehicleType: 'sedan',
    lieFlatRequired: false,
    assistDischarge: true,
    needs: ['协助办理出院手续'],
    contact: { name: '陈**', phone: '138****6612' },
    sla: { respondDeadline: null, confirmDeadline: null },
    evaluation: null,
    provider: null,
    vehicle: null,
    driver: null,
    ...over
  }
}

// 已完成行程的完整 9 个节点：以送达时刻为基准往前倒排
function doneTimeline(arrivedAt, extra = {}) {
  return [
    { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理，材料进入审核', at: minutesBefore(arrivedAt, 2910), actor: '客户', level: 'done' },
    { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: minutesBefore(arrivedAt, 2790), actor: '平台', level: 'done' },
    { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: minutesBefore(arrivedAt, 2700), actor: '平台', level: 'done' },
    { code: 'CONFIRMED', label: '服务确认', desc: `${extra.short || '服务商'}接单，车辆与司机已锁定`, at: minutesBefore(arrivedAt, 2590), actor: '服务商', level: 'done' },
    { code: 'REMINDED', label: '行前提醒', desc: '已确认上车地点与时间', at: minutesBefore(arrivedAt, 1080), actor: '服务商', level: 'done' },
    { code: 'DEPARTED', label: '车辆出发', desc: '司机已出发前往医院', at: minutesBefore(arrivedAt, 70), actor: '司机', level: 'done' },
    { code: 'PICKED', label: '接到客户', desc: '已完成出院手续与上车', at: minutesBefore(arrivedAt, 24), actor: '司机', level: 'done' },
    { code: 'ARRIVED', label: '送达目的地', desc: '已到达家庭常住地', at: iso(arrivedAt), actor: '司机', level: 'done' },
    { code: 'DONE', label: '服务完成', desc: '回单确认，服务结束', at: iso(new Date(arrivedAt.getTime() + 12 * 60000)), actor: '服务商', level: 'done' }
  ]
}

function buildOrders() {
  const p02 = provider('P02')
  const p01 = provider('P01')

  /* ---------- 进行中：已确认，明天出行（首页与"进行中"页签的主展示） ---------- */
  const travelTomorrow = dayOffset(1, 10, 0)
  const confirmedBase = base({
    status: 'CONFIRMED',
    hospital: hospital('安徽医科大学第一附属医院'),
    admissionDate: ymdOf(dayOffset(-6)),
    dischargeDate: ymdOf(travelTomorrow),
    travelDate: ymdOf(travelTomorrow),
    travelTime: '10:00',
    address: ADDR_HEFEI,
    passengerCount: 2,
    distanceKm: 12,
    needs: ['协助办理出院手续', '轮椅'],
    provider: p02,
    vehicle: { id: 'V-S1', name: '五座轿车 · 大众帕萨特', type: 'sedan', seats: 5, luggage: 3 },
    driver: { id: 'D05', surname: '刘', years: 9, certified: true, plate: plateForCity('合肥', 4) },
    sla: {
      respondDeadline: iso(new Date(Date.now() + 12 * 3600000)),
      confirmDeadline: iso(new Date(Date.now() + 20 * 3600000))
    },
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理，材料进入审核', at: iso(dayOffset(-2, 9, 12)), actor: '客户', level: 'done' },
      { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: iso(dayOffset(-2, 11, 5)), actor: '平台', level: 'done' },
      { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: iso(dayOffset(-2, 11, 40)), actor: '平台', level: 'done' },
      { code: 'CONFIRMED', label: '服务确认', desc: '途安护送接单，车辆与司机已锁定', at: iso(dayOffset(-2, 13, 20)), actor: '服务商', level: 'done' },
      { code: 'REMINDED', label: '行前提醒', desc: '已确认上车地点与时间', at: iso(dayOffset(0, 17, 30)), actor: '服务商', level: 'done' }
    ]
  })
  confirmedBase.id = orderId(travelTomorrow, '0417')
  confirmedBase.createdAt = confirmedBase.timeline[0].at
  confirmedBase.updatedAt = iso(dayOffset(0, 17, 30))

  /* ---------- 进行中：派单中，运力匹配（第二层状态演示） ---------- */
  const travelIn3 = dayOffset(3, 14, 30)
  const dispatching = base({
    status: 'DISPATCHING',
    hospital: hospital('合肥市第一人民医院'),
    admissionDate: ymdOf(dayOffset(-1)),
    dischargeDate: ymdOf(travelIn3),
    travelDate: ymdOf(travelIn3),
    travelTime: '14:30',
    address: { ...ADDR_HEFEI, district: '包河区', community: '滨湖世纪城' },
    passengerCount: 1,
    distanceKm: 15,
    needs: [],
    sla: {
      respondDeadline: iso(new Date(Date.now() + 6 * 3600000)),
      confirmDeadline: iso(new Date(Date.now() + 18 * 3600000))
    },
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理，材料进入审核', at: iso(dayOffset(0, 8, 20)), actor: '客户', level: 'done' },
      { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: iso(dayOffset(0, 10, 10)), actor: '平台', level: 'done' },
      { code: 'DISPATCHED', label: '派单', desc: '已向属地 3 家服务商派单', at: iso(dayOffset(0, 10, 45)), actor: '平台', level: 'doing' }
    ]
  })
  dispatching.id = orderId(dayOffset(0), '0286')
  dispatching.createdAt = dispatching.timeline[0].at
  dispatching.updatedAt = iso(dayOffset(0, 10, 45))

  /* ---------- 已完成，待评价（7 天前） ---------- */
  const arrived7 = dayOffset(-7, 15, 36)
  const donePending = base({
    status: 'COMPLETED',
    hospital: hospital('安徽医科大学第一附属医院'),
    admissionDate: ymdOf(dayOffset(-13)),
    dischargeDate: ymdOf(arrived7),
    travelDate: ymdOf(arrived7),
    travelTime: '15:00',
    address: ADDR_HEFEI,
    passengerCount: 2,
    distanceKm: 12,
    provider: p02,
    vehicle: { id: 'V-S2', name: '五座轿车 · 本田雅阁', type: 'sedan', seats: 5, luggage: 3 },
    driver: { id: 'D01', surname: '王', years: 8, certified: true, plate: plateForCity('合肥', 0) },
    timeline: doneTimeline(arrived7, { short: '途安护送' })
  })
  donePending.id = orderId(dayOffset(-7), '0846')
  donePending.createdAt = donePending.timeline[0].at
  donePending.updatedAt = iso(new Date(arrived7.getTime() + 14 * 60000))

  /* ---------- 已完成，5 星（33 天前） ---------- */
  const arrived33 = dayOffset(-33, 11, 12)
  const done5 = base({
    status: 'COMPLETED',
    hospital: hospital('中国科学技术大学附属第一医院（安徽省立医院）'),
    admissionDate: ymdOf(dayOffset(-40)),
    dischargeDate: ymdOf(arrived33),
    travelDate: ymdOf(arrived33),
    travelTime: '10:30',
    address: { ...ADDR_HEFEI, district: '庐阳区', community: '华地公馆' },
    passengerCount: 2,
    distanceKm: 8,
    provider: p02,
    vehicle: { id: 'V-S1', name: '五座轿车 · 大众帕萨特', type: 'sedan', seats: 5, luggage: 3 },
    driver: { id: 'D05', surname: '刘', years: 9, certified: true, plate: plateForCity('合肥', 4) },
    timeline: doneTimeline(arrived33, { short: '途安护送' }),
    evaluation: {
      rating: 5,
      tags: ['ontime', 'driver', 'help'],
      note: '师傅提前二十分钟到病房楼下，帮我们把轮椅和行李都搬上车，一路很稳。',
      at: iso(new Date(arrived33.getTime() + 3 * 3600000))
    }
  })
  done5.id = orderId(dayOffset(-33), '0317')
  done5.createdAt = done5.timeline[0].at
  done5.updatedAt = done5.evaluation.at

  /* ---------- 已完成，4 星（96 天前） ---------- */
  const arrived96 = dayOffset(-96, 10, 2)
  const done4 = base({
    status: 'COMPLETED',
    hospital: hospital('合肥市第一人民医院'),
    admissionDate: ymdOf(dayOffset(-103)),
    dischargeDate: ymdOf(arrived96),
    travelDate: ymdOf(arrived96),
    travelTime: '09:30',
    address: { ...ADDR_HEFEI, district: '包河区', community: '滨湖世纪城' },
    passengerCount: 1,
    distanceKm: 15,
    provider: p01,
    vehicle: { id: 'V-M1', name: '七座商务车 · 别克GL8', type: 'mpv', seats: 7, luggage: 5 },
    driver: { id: 'D03', surname: '张', years: 11, certified: true, plate: plateForCity('合肥', 6) },
    timeline: doneTimeline(arrived96, { short: '安康转运' }),
    evaluation: {
      rating: 4,
      tags: ['driver', 'clean'],
      note: '车很干净，司机准时。就是院里停车位紧张，多等了一会儿。',
      at: iso(new Date(arrived96.getTime() + 10 * 3600000))
    }
  })
  done4.id = orderId(dayOffset(-96), '0692')
  done4.createdAt = done4.timeline[0].at
  done4.updatedAt = done4.evaluation.at

  /* ---------- 已取消（62 天前） ---------- */
  const cancelled = base({
    status: 'CLOSED',
    closeReason: 'CANCELLED',
    cancelReason: '行程有变，暂不需要',
    hospital: hospital('安徽医科大学第一附属医院'),
    admissionDate: ymdOf(dayOffset(-67)),
    dischargeDate: ymdOf(dayOffset(-62)),
    travelDate: ymdOf(dayOffset(-62)),
    travelTime: '11:00',
    address: ADDR_HEFEI,
    passengerCount: 2,
    distanceKm: 12,
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: iso(dayOffset(-63, 16, 12)), actor: '客户', level: 'done' },
      { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: iso(dayOffset(-63, 17, 2)), actor: '平台', level: 'done' },
      { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: iso(dayOffset(-63, 17, 30)), actor: '平台', level: 'done' },
      { code: 'CANCELLED', label: '申请已取消', desc: '行程有变，暂不需要', at: iso(dayOffset(-62, 8, 41)), actor: '客户', level: 'warn' }
    ]
  })
  cancelled.id = orderId(dayOffset(-62), '0233')
  cancelled.createdAt = cancelled.timeline[0].at
  cancelled.updatedAt = cancelled.timeline[cancelled.timeline.length - 1].at

  /* ---------- 审核未通过（121 天前） ---------- */
  const rejected = base({
    status: 'CLOSED',
    closeReason: 'REJECTED',
    rejectReason: '就诊医院为一级医疗机构，不在本服务覆盖的二级及以上公立医院范围内',
    hospital: hospital('合肥康民社区卫生服务中心'),
    admissionDate: ymdOf(dayOffset(-124)),
    dischargeDate: ymdOf(dayOffset(-121)),
    travelDate: ymdOf(dayOffset(-121)),
    travelTime: '14:00',
    address: ADDR_HEFEI,
    passengerCount: 1,
    distanceKm: 6,
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: iso(dayOffset(-122, 10, 20)), actor: '客户', level: 'done' },
      { code: 'REJECTED', label: '审核未通过', desc: '就诊医院等级不符合服务范围', at: iso(dayOffset(-122, 12, 5)), actor: '平台', level: 'danger' }
    ]
  })
  rejected.id = orderId(dayOffset(-121), '0118')
  rejected.createdAt = rejected.timeline[0].at
  rejected.updatedAt = rejected.timeline[1].at

  // 进行中排前面，其次按时间倒序
  return [confirmedBase, dispatching, donePending, done5, done4, cancelled, rejected]
}

// 配套消息：与上面节点的状态对得上
function buildMessages(orders) {
  const get = id => orders.find(o => o.id === id)
  const confirmed = orders[0]
  const dispatching = orders[1]
  const pending = orders[2]
  const done5 = orders[3]
  const cancelled = orders[5]
  return [
    {
      id: 'MS3020', type: 'system', read: false, orderId: confirmed.id,
      title: '行前提醒', body: `明天 ${confirmed.travelTime} 从安徽医科大学第一附属医院出发，车牌 ${confirmed.driver.plate}，司机刘师傅。`,
      at: confirmed.updatedAt
    },
    {
      id: 'MS3019', type: 'system', read: false, orderId: confirmed.id,
      title: '服务已确认', body: `途安护送已接单，车辆 ${confirmed.vehicle.name}，将提前联系你确认上车地点。`,
      at: confirmed.timeline[3].at
    },
    {
      id: 'MS3018', type: 'system', read: false, orderId: dispatching.id,
      title: '材料审核通过', body: '申请已进入派单，正在匹配属地服务商，确认后会通知车辆与司机信息。',
      at: dispatching.timeline[1].at
    },
    {
      id: 'MS3017', type: 'system', read: true, orderId: pending.id,
      title: '服务已完成', body: '本次出院交通安排已送达家庭常住地，欢迎对服务做出评价。',
      at: pending.updatedAt
    },
    {
      id: 'MS3016', type: 'system', read: true, orderId: done5.id,
      title: '评价已收到', body: '感谢你对途安护送的 5 星评价，我们会把反馈同步给服务商。',
      at: get(done5.id)?.evaluation?.at || done5.updatedAt
    },
    {
      id: 'MS3015', type: 'system', read: true, orderId: cancelled.id,
      title: '申请已取消', body: `受理编号 ${cancelled.id} 的出院交通安排申请已取消，本次住院权益未使用。`,
      at: cancelled.updatedAt
    }
  ]
}

export function seedDemoOrders({ force = false } = {}) {
  const stored = localStorage.getItem(VER_KEY)
  if (!force) {
    // 已经有数据且版本一致 → 不动
    if (localStorage.getItem(KEY) !== null && stored === String(SEED_VERSION)) return false
  }

  const fresh = buildOrders()
  const demoIds = new Set(fresh.map(o => o.id))
  // 老版本示例的订单号（升级时清掉，避免同一份数据出现两套）
  const LEGACY_IDS = [
    'CY2609180317', 'CY2610120846', 'CY2606230692', 'CY2605110233', 'CY2603020118'
  ]

  // 保留用户自己走流程生成的订单，替换掉示例订单
  const mine = store.orders.filter(o => !demoIds.has(o.id) && !LEGACY_IDS.includes(o.id))
  store.orders = [...fresh, ...mine]

  // 消息同理：示例消息重建，用户自己的消息保留
  const demoMsgIds = new Set(['MS3012', 'MS3011', 'MS3010', 'MS3009', 'MS3020', 'MS3019', 'MS3018', 'MS3017', 'MS3016', 'MS3015'])
  const myMsgs = store.messages.filter(m => !demoMsgIds.has(m.id) && !LEGACY_IDS.includes(m.orderId))
  store.messages = [...buildMessages(fresh), ...myMsgs]

  if (!store.address) {
    store.setAddress({ ...ADDR_HEFEI, registeredAt: iso(dayOffset(-160, 10, 0)), locked: true })
  }
  store.persist()
  localStorage.setItem(VER_KEY, String(SEED_VERSION))
  return true
}
