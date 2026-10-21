// 演示控制台与场景预设：只在 demo=1 或入口页出现
import { store } from './orders.js'
import { STATUS, TIMELINE_STEPS } from '../rules/status.js'
import { addWorkHours } from '../rules/time.js'
import { PROVIDERS, VEHICLES, driverForCity } from '../data/providers.js'
import { HOSPITALS } from '../data/hospitals.js'

function iso(d) { return d.toISOString() }
function hoursAgo(h) { return iso(new Date(Date.now() - h * 3600000)) }
function hoursLater(h) { return iso(new Date(Date.now() + h * 3600000)) }

const ADDR = { province: '安徽', city: '合肥', district: '蜀山区', community: '万科城', detail: '', proofType: 'house', label: '房产证 / 购房合同' }

function baseOrder(over = {}) {
  const h = HOSPITALS.find(x => x.name.includes('安徽医科大学第一附属医院')) || HOSPITALS[0]
  const now = new Date()
  const address = { ...ADDR, ...(over.address || {}) }
  return {
    id: over.id || 'CY' + String(Date.now()).slice(-8) + Math.floor(Math.random() * 90 + 10),
    memberId: 'M0001',
    memberName: '陈**',
    status: 'REVIEWING',
    hospital: { id: h.id, name: h.name, city: h.city, district: h.district, level: h.level, nature: h.nature },
    admissionDate: '2026-10-16',
    dischargeDate: '2026-10-22',
    address,
    passengerCount: 2,
    travelDate: '2026-10-22',
    travelTime: '10:00',
    vehicleType: 'sedan',
    lieFlatRequired: false,
    assistDischarge: true,
    needs: ['协助办理出院手续', '轮椅'],
    luggage: 2,
    contact: { name: '陈**', phone: '138****6612' },
    distanceKm: 12,
    tripType: 'short',
    materials: [
      { type: 'hospital', label: '住院材料', files: [{ name: '出院小结.jpg', size: 820 }], status: 'ok' },
      { type: 'address', label: '住址证明', files: [{ name: '房产证.jpg', size: 640 }], status: 'ok' },
      { type: 'doctor', label: '平躺医嘱', files: [], status: 'na' }
    ],
    provider: null,
    vehicle: null,
    driver: null,
    sla: { respondDeadline: iso(addWorkHours(now, 12)), confirmDeadline: iso(addWorkHours(now, 24)) },
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理，材料进入审核', at: hoursAgo(1), actor: '客户', level: 'done' }
    ],
    evaluation: null,
    cancelReason: '',
    rejectReason: '',
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
    ...over
  }
}

function withProvider(order, o = {}) {
  const p = PROVIDERS.find(x => x.id === (o.providerId || 'P02')) || PROVIDERS[1]
  const veh = (VEHICLES[o.vehType || 'sedan'] || VEHICLES.sedan)[0]
  const drv = driverForCity(order.hospital.city, 0)
  return {
    ...order,
    provider: { id: p.id, name: p.name, short: p.short, level: p.level, rating: p.rating, orders: p.orders, tags: p.tags },
    vehicle: { id: veh.id, name: veh.name, type: veh.type, seats: veh.seats, luggage: veh.luggage },
    driver: { ...drv }
  }
}

export const SCENARIOS = [
  {
    key: 'short', name: '短途 · 审核中', desc: '合肥市内 12 公里，材料齐全，等待审核',
    build: () => baseOrder({ status: 'REVIEWING' })
  },
  {
    key: 'needinfo', name: '待补材料', desc: '出院小结模糊，需重新上传',
    build: () => baseOrder({
      status: 'NEED_INFO',
      materials: [
        { type: 'hospital', label: '住院材料', files: [{ name: '出院小结.jpg', size: 820 }], status: 'problem', remark: '照片模糊，无法识别住院日期与医生签字，请重新拍摄' },
        { type: 'address', label: '住址证明', files: [{ name: '房产证.jpg', size: 640 }], status: 'ok' },
        { type: 'doctor', label: '平躺医嘱', files: [], status: 'na' }
      ],
      timeline: [
        ...baseOrder().timeline,
        { code: 'REVIEWING', label: '材料核验', desc: '住院材料不清晰，已发送补充通知', at: hoursAgo(0.5), actor: '平台', level: 'warn' }
      ]
    })
  },
  {
    key: 'dispatching', name: '派单中 · 即将超时', desc: '已审核通过，属地运力紧张',
    build: () => baseOrder({
      status: 'DISPATCHING',
      sla: { respondDeadline: hoursAgo(13), confirmDeadline: hoursLater(0.6) },
      timeline: [
        { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: hoursAgo(26), actor: '客户', level: 'done' },
        { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: hoursAgo(25), actor: '平台', level: 'done' },
        { code: 'DISPATCHED', label: '派单', desc: '已向属地 3 家服务商派单', at: hoursAgo(24), actor: '平台', level: 'done' }
      ]
    })
  },
  {
    key: 'confirmed', name: '已确认 · 明日出行', desc: '服务商已接单，车辆与司机已锁定',
    build: () => withProvider(baseOrder({
      status: 'CONFIRMED',
      travelDate: '2026-10-23',
      timeline: [
        { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: hoursAgo(30), actor: '客户', level: 'done' },
        { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: hoursAgo(29), actor: '平台', level: 'done' },
        { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: hoursAgo(28), actor: '平台', level: 'done' },
        { code: 'CONFIRMED', label: '服务确认', desc: '途安护送接单，车辆与司机已锁定', at: hoursAgo(26), actor: '服务商', level: 'done' }
      ]
    }))
  },
  {
    key: 'long', name: '长途 · 合肥到北京', desc: '超过 200 公里，票务方案',
    build: () => withProvider(baseOrder({
      status: 'CONFIRMED',
      tripType: 'long',
      distanceKm: 1215,
      vehicleType: 'train',
      address: { province: '北京', city: '北京', district: '朝阳区', community: '华润中心', detail: '', proofType: 'idcard', label: '身份证' },
      passengerCount: 2,
      travelDate: '2026-10-23',
      timeline: [
        { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: hoursAgo(30), actor: '客户', level: 'done' },
        { code: 'REVIEWED', label: '审核通过', desc: '长途票务方案已确认', at: hoursAgo(29), actor: '平台', level: 'done' },
        { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: hoursAgo(28), actor: '平台', level: 'done' },
        { code: 'CONFIRMED', label: '服务确认', desc: '安康转运接单', at: hoursAgo(26), actor: '服务商', level: 'done' }
      ]
    }), { providerId: 'P01' })
  },
  {
    key: 'lieflat', name: '平躺需求', desc: '需医嘱证明，车型为非急救转运车',
    build: () => withProvider(baseOrder({
      status: 'CONFIRMED',
      vehicleType: 'lieflat',
      lieFlatRequired: true,
      needs: ['平躺', '协助办理出院手续'],
      travelDate: '2026-10-23',
      materials: [
        { type: 'hospital', label: '住院材料', files: [{ name: '出院小结.jpg', size: 820 }], status: 'ok' },
        { type: 'address', label: '住址证明', files: [{ name: '房产证.jpg', size: 640 }], status: 'ok' },
        { type: 'doctor', label: '平躺医嘱', files: [{ name: '医嘱证明.jpg', size: 410 }], status: 'ok' }
      ],
      timeline: [
        { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: hoursAgo(30), actor: '客户', level: 'done' },
        { code: 'REVIEWED', label: '审核通过', desc: '医嘱证明核验通过', at: hoursAgo(29), actor: '平台', level: 'done' },
        { code: 'DISPATCHED', label: '派单', desc: '匹配到具备平躺运力的服务商', at: hoursAgo(28), actor: '平台', level: 'done' },
        { code: 'CONFIRMED', label: '服务确认', desc: '康程转运接单', at: hoursAgo(26), actor: '服务商', level: 'done' }
      ]
    }), { providerId: 'P04', vehType: 'lieflat' })
  },
  {
    key: 'ontheway', name: '车辆前往医院', desc: '司机已出发，可查看车牌与联系',
    build: () => withProvider(baseOrder({
      status: 'ON_THE_WAY',
      travelDate: '2026-10-22',
      timeline: [
        { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: hoursAgo(50), actor: '客户', level: 'done' },
        { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: hoursAgo(48), actor: '平台', level: 'done' },
        { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: hoursAgo(47), actor: '平台', level: 'done' },
        { code: 'CONFIRMED', label: '服务确认', desc: '途安护送接单', at: hoursAgo(45), actor: '服务商', level: 'done' },
        { code: 'REMINDED', label: '行前提醒', desc: '已确认上车地点与时间', at: hoursAgo(2), actor: '服务商', level: 'done' },
        { code: 'DEPARTED', label: '车辆出发', desc: '司机已出发前往医院', at: hoursAgo(0.2), actor: '司机', level: 'doing' }
      ]
    }))
  },
  {
    key: 'completed', name: '已完成 · 待评价', desc: '行程完成，等待评价',
    build: () => withProvider(baseOrder({
      status: 'COMPLETED',
      travelDate: '2026-10-20',
      timeline: [
        { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: hoursAgo(72), actor: '客户', level: 'done' },
        { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过', at: hoursAgo(70), actor: '平台', level: 'done' },
        { code: 'DISPATCHED', label: '派单', desc: '匹配到属地服务商', at: hoursAgo(69), actor: '平台', level: 'done' },
        { code: 'CONFIRMED', label: '服务确认', desc: '途安护送接单', at: hoursAgo(66), actor: '服务商', level: 'done' },
        { code: 'REMINDED', label: '行前提醒', desc: '已确认上车地点与时间', at: hoursAgo(26), actor: '服务商', level: 'done' },
        { code: 'DEPARTED', label: '车辆出发', desc: '司机已出发前往医院', at: hoursAgo(5), actor: '司机', level: 'done' },
        { code: 'PICKED', label: '接到客户', desc: '已完成出院手续与上车', at: hoursAgo(4), actor: '司机', level: 'done' },
        { code: 'ARRIVED', label: '送达目的地', desc: '已到达家庭常住地', at: hoursAgo(3), actor: '司机', level: 'done' },
        { code: 'DONE', label: '服务完成', desc: '回单确认，服务结束', at: hoursAgo(2.8), actor: '服务商', level: 'done' }
      ]
    }))
  },
  {
    key: 'rejected', name: '审核驳回', desc: '医院等级不符，已结束',
    build: () => baseOrder({
      status: 'CLOSED',
      closeReason: 'REJECTED',
      rejectReason: '就诊医院为一级医疗机构，不在本服务覆盖的二级及以上公立医院范围内',
      timeline: [
        { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理', at: hoursAgo(20), actor: '客户', level: 'done' },
        { code: 'REJECTED', label: '审核未通过', desc: '就诊医院等级不符合服务范围', at: hoursAgo(18), actor: '平台', level: 'danger' }
      ]
    })
  }
]

export function loadScenario(key) {
  const s = SCENARIOS.find(x => x.key === key)
  if (!s) return null
  const order = s.build()
  store.addOrder(order)
  store.pushMessage({ type: 'system', title: '演示数据已载入', body: `场景：${s.name}`, orderId: order.id })
  return order
}

export function resetAll() {
  store.reset()
  localStorage.removeItem('cy_draft')
}
