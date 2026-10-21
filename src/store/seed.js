// 服务记录的示例数据：首次打开时写入，用于展示「订单状态跟踪 + 服务完成评价」
// 只在本机还没有任何记录时灌一次；清空数据后不会自动重灌，可在平台操作台手动载入
import { store } from './orders.js'
import { PROVIDERS } from '../data/providers.js'

const KEY = 'cy_orders'

// 直接写死示例医院信息，避免把整份医院库（260KB）拉进首屏包
const HOSPITAL_INDEX = {
  '中国科学技术大学附属第一医院（安徽省立医院）': { id: 'H0002', city: '合肥', district: '庐阳区', level: '三级甲等', nature: '公立' },
  '安徽医科大学第一附属医院': { id: 'H0001', city: '合肥', district: '蜀山区', level: '三级甲等', nature: '公立' },
  '合肥市第一人民医院': { id: 'H0003', city: '合肥', district: '庐阳区', level: '三级甲等', nature: '公立' },
  '合肥康民社区卫生服务中心': { id: 'H0005', city: '合肥', district: '庐江县', level: '一级', nature: '公立' }
}

function hospital(name) {
  return { name, ...(HOSPITAL_INDEX[name] || { id: 'H0001', city: '合肥', district: '蜀山区', level: '三级甲等', nature: '公立' }) }
}

function provider(id) {
  const p = PROVIDERS.find(x => x.id === id) || PROVIDERS[0]
  return { id: p.id, name: p.name, short: p.short, level: p.level, rating: p.rating, orders: p.orders, tags: p.tags }
}

// 每次出行的完整节点：按出行时间往前倒排
function tripTimeline(doneAt, extra = {}) {
  const t = (min) => new Date(new Date(doneAt).getTime() + min * 60000).toISOString()
  return [
    { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理，材料进入审核', at: t(-2910), actor: '客户', level: 'done' },
    { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: t(-2790), actor: '平台', level: 'done' },
    { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: t(-2700), actor: '平台', level: 'done' },
    { code: 'CONFIRMED', label: '服务确认', desc: `${extra.short || '服务商'}接单，车辆与司机已锁定`, at: t(-2590), actor: '服务商', level: 'done' },
    { code: 'REMINDED', label: '行前提醒', desc: '已确认上车地点与时间', at: t(-1080), actor: '服务商', level: 'done' },
    { code: 'DEPARTED', label: '车辆出发', desc: '司机已出发前往医院', at: t(-70), actor: '司机', level: 'done' },
    { code: 'PICKED', label: '接到客户', desc: '已完成出院手续与上车', at: t(-24), actor: '司机', level: 'done' },
    { code: 'ARRIVED', label: '送达目的地', desc: '已到达家庭常住地', at: t(0), actor: '司机', level: 'done' },
    { code: 'DONE', label: '服务完成', desc: '回单确认，服务结束', at: t(12), actor: '服务商', level: 'done' }
  ]
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
    ...over
  }
}

const ADDR_HEFEI = { province: '安徽', city: '合肥', district: '蜀山区', community: '万科城', detail: '', proofType: 'house', label: '房产证 / 购房合同' }

// 5 条历史记录：2 条已评价、1 条待评价、1 条已取消、1 条审核未通过
function buildOrders() {
  const p02 = provider('P02')
  const p01 = provider('P01')

  const o1 = base({
    id: 'CY2609180317',
    status: 'COMPLETED',
    hospital: hospital('中国科学技术大学附属第一医院（安徽省立医院）'),
    admissionDate: '2026-09-11',
    dischargeDate: '2026-09-18',
    travelDate: '2026-09-18',
    travelTime: '10:30',
    address: { ...ADDR_HEFEI, district: '庐阳区', community: '华地公馆' },
    passengerCount: 2,
    distanceKm: 8,
    provider: p02,
    vehicle: { id: 'V-S1', name: '五座轿车 · 本田雅阁', type: 'sedan', seats: 5, luggage: 3 },
    driver: { id: 'D01', surname: '王', years: 8, certified: true, plate: '皖A·6K2**', phone: '138****6621' },
    timeline: tripTimeline('2026-09-18T11:12:00+08:00', { short: '途安护送' }),
    evaluation: {
      rating: 5,
      tags: ['ontime', 'driver', 'help'],
      note: '师傅提前二十分钟到病房楼下，帮我们把轮椅和行李都搬上车，一路很稳。',
      at: '2026-09-18T14:30:00+08:00'
    },
    createdAt: '2026-09-16T14:20:00+08:00',
    updatedAt: '2026-09-18T14:30:00+08:00'
  })

  const o2 = base({
    id: 'CY2610120846',
    status: 'COMPLETED',
    hospital: hospital('安徽医科大学第一附属医院'),
    admissionDate: '2026-10-06',
    dischargeDate: '2026-10-12',
    travelDate: '2026-10-12',
    travelTime: '15:00',
    address: ADDR_HEFEI,
    passengerCount: 2,
    distanceKm: 12,
    needs: ['协助办理出院手续', '轮椅'],
    provider: p02,
    vehicle: { id: 'V-S1', name: '五座轿车 · 大众帕萨特', type: 'sedan', seats: 5, luggage: 3 },
    driver: { id: 'D05', surname: '刘', years: 9, certified: true, plate: '皖A·8H7**', phone: '135****2250' },
    timeline: tripTimeline('2026-10-12T15:36:00+08:00', { short: '途安护送' }),
    createdAt: '2026-10-10T09:05:00+08:00',
    updatedAt: '2026-10-12T15:50:00+08:00'
  })

  const o3 = base({
    id: 'CY2606230692',
    status: 'COMPLETED',
    hospital: hospital('合肥市第一人民医院'),
    admissionDate: '2026-06-16',
    dischargeDate: '2026-06-23',
    travelDate: '2026-06-23',
    travelTime: '09:30',
    address: { ...ADDR_HEFEI, district: '包河区', community: '滨湖世纪城' },
    passengerCount: 1,
    distanceKm: 15,
    provider: p01,
    vehicle: { id: 'V-S2', name: '七座商务车 · 别克GL8', type: 'mpv', seats: 7, luggage: 4 },
    driver: { id: 'D03', surname: '张', years: 11, certified: true, plate: '皖A·9M1**', phone: '136****4472' },
    timeline: tripTimeline('2026-06-23T10:02:00+08:00', { short: '安康转运' }),
    evaluation: {
      rating: 4,
      tags: ['driver', 'clean'],
      note: '车很干净，司机准时。就是院里停车位紧张，多等了一会儿。',
      at: '2026-06-23T20:10:00+08:00'
    },
    createdAt: '2026-06-21T18:40:00+08:00',
    updatedAt: '2026-06-23T20:10:00+08:00'
  })

  const o4 = base({
    id: 'CY2605110233',
    status: 'CLOSED',
    closeReason: 'CANCELLED',
    cancelReason: '行程有变，暂不需要',
    hospital: hospital('安徽医科大学第一附属医院'),
    admissionDate: '2026-05-06',
    dischargeDate: '2026-05-11',
    travelDate: '2026-05-11',
    travelTime: '11:00',
    address: ADDR_HEFEI,
    passengerCount: 2,
    distanceKm: 12,
    provider: null,
    vehicle: null,
    driver: null,
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: '2026-05-10T16:12:00+08:00', actor: '客户', level: 'done' },
      { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: '2026-05-10T17:02:00+08:00', actor: '平台', level: 'done' },
      { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: '2026-05-10T17:30:00+08:00', actor: '平台', level: 'done' },
      { code: 'CANCELLED', label: '申请已取消', desc: '行程有变，暂不需要', at: '2026-05-10T20:41:00+08:00', actor: '客户', level: 'warn' }
    ],
    createdAt: '2026-05-10T16:12:00+08:00',
    updatedAt: '2026-05-10T20:41:00+08:00'
  })

  const o5 = base({
    id: 'CY2603020118',
    status: 'CLOSED',
    closeReason: 'REJECTED',
    rejectReason: '就诊医院为一级医疗机构，不在本服务覆盖的二级及以上公立医院范围内',
    hospital: hospital('合肥康民社区卫生服务中心'),
    admissionDate: '2026-02-27',
    dischargeDate: '2026-03-02',
    travelDate: '2026-03-02',
    travelTime: '14:00',
    address: ADDR_HEFEI,
    passengerCount: 1,
    distanceKm: 6,
    provider: null,
    vehicle: null,
    driver: null,
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: '2026-03-01T10:20:00+08:00', actor: '客户', level: 'done' },
      { code: 'REJECTED', label: '审核未通过', desc: '就诊医院等级不符合服务范围', at: '2026-03-01T12:05:00+08:00', actor: '平台', level: 'danger' }
    ],
    createdAt: '2026-03-01T10:20:00+08:00',
    updatedAt: '2026-03-01T12:05:00+08:00'
  })

  return [o2, o1, o3, o4, o5]
}

// 配套消息：与服务记录里的节点对得上
function buildMessages(orders) {
  const byId = Object.fromEntries(orders.map(o => [o.id, o]))
  const doneAt = (id) => byId[id]?.updatedAt || new Date().toISOString()
  return [
    {
      id: 'MS3012', type: 'system', read: false, orderId: 'CY2610120846',
      title: '服务已完成', body: '本次出院交通安排已送达家庭常住地，欢迎对服务做出评价。',
      at: doneAt('CY2610120846')
    },
    {
      id: 'MS3011', type: 'system', read: true, orderId: 'CY2610120846',
      title: '行前提醒', body: '明天 15:00 从安徽医科大学第一附属医院出发，车牌 皖A·8H7**，司机刘师傅。',
      at: '2026-10-11T16:00:00+08:00'
    },
    {
      id: 'MS3010', type: 'system', read: true, orderId: 'CY2609180317',
      title: '评价已收到', body: '感谢你对途安护送的 5 星评价，我们会把反馈同步给服务商。',
      at: '2026-09-18T14:31:00+08:00'
    },
    {
      id: 'MS3009', type: 'system', read: true, orderId: 'CY2605110233',
      title: '申请已取消', body: '受理编号 CY2605110233 的出院交通安排申请已取消，本次住院权益未使用。',
      at: '2026-05-10T20:41:00+08:00'
    }
  ]
}

export function seedDemoOrders({ force = false } = {}) {
  // 已经有数据就不覆盖，避免把用户自己走的流程冲掉
  if (!force && localStorage.getItem(KEY) !== null) return false
  const orders = buildOrders()
  store.orders = orders
  store.messages = buildMessages(orders)
  if (!store.address) {
    store.setAddress({ ...ADDR_HEFEI, registeredAt: '2026-05-06T10:00:00+08:00', locked: true })
  }
  store.persist()
  return true
}
