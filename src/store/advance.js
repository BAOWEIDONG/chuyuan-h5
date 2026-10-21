// 演示控制台的状态推进：把"平台 / 服务商 / 司机"侧的动作，写成用户端能看到的结果
import { store } from './orders.js'
import { canTransition, TIMELINE_STEPS } from '../rules/status.js'
import { PROVIDERS, providersForCity, VEHICLES, driverForCity } from '../data/providers.js'
import { addWorkHours } from '../rules/time.js'

function event(code, actor, level = 'done', desc) {
  const s = TIMELINE_STEPS.find(x => x.code === code)
  return {
    code,
    label: s?.label || code,
    desc: desc || s?.desc || '',
    at: new Date().toISOString(),
    actor,
    level
  }
}

function attachProvider(order, providerId, vehType) {
  const pool = providersForCity(order.hospital.city)
  const p = providerId ? PROVIDERS.find(x => x.id === providerId) : pool[0]
  const type = vehType || (order.lieFlatRequired ? 'lieflat' : 'sedan')
  const veh = (VEHICLES[type] || VEHICLES.sedan)[0]
  const drv = driverForCity(order.hospital.city, Math.floor(Math.random() * 5))
  return {
    provider: { id: p.id, name: p.name, short: p.short, level: p.level, rating: p.rating, orders: p.orders, tags: p.tags },
    vehicle: { id: veh.id, name: veh.name, type: veh.type, seats: veh.seats, luggage: veh.luggage },
    driver: { ...drv }
  }
}

export function advanceOrder(id) {
  const o = store.getOrder(id)
  if (!o) return { ok: false, msg: '订单不存在' }
  const s = o.status
  if (s === 'DRAFT') return push(o, 'REVIEWING', event('SUBMITTED', '客户'))
  if (s === 'REVIEWING') {
    // 审核通过 → 进入派单（状态机允许 REVIEWING → DISPATCHING）
    const n = providersForCity(o.hospital.city).length
    const next = { ...o, status: 'DISPATCHING' }
    next.timeline = [...o.timeline,
      event('REVIEWED', '平台', 'done', '服务条件与材料核验通过'),
      event('DISPATCHED', '平台', 'doing', `已向属地 ${n} 家服务商派单`)
    ]
    store.updateOrder(id, next)
    message(o.id, '材料审核通过', '申请已进入派单，正在匹配属地服务商。')
    return { ok: true, status: 'DISPATCHING' }
  }
  if (s === 'NEED_INFO') return push(o, 'REVIEWING', event('SUBMITTED', '客户', 'done', '材料已补充，重新进入审核'))
  if (s === 'DISPATCHING') {
    const next = { ...o, ...attachProvider(o), status: 'CONFIRMED' }
    next.timeline = [...o.timeline.map(t => (t.code === 'DISPATCHED' ? { ...t, level: 'done' } : t)),
      event('CONFIRMED', '服务商', 'done', `${next.provider.short} 接单，车辆与司机已锁定`)]
    store.updateOrder(id, next)
    message(o.id, '服务已确认', `${next.provider.short} 已接单。`)
    return { ok: true, status: 'CONFIRMED' }
  }
  if (s === 'CONFIRMED') {
    const next = { ...o, status: 'ON_THE_WAY' }
    next.timeline = [...o.timeline,
      event('REMINDED', '服务商', 'done', '已电话确认上车地点与出院时间'),
      event('DEPARTED', '司机', 'doing', '司机已出发前往医院')]
    store.updateOrder(id, next)
    message(o.id, '车辆已出发', `${o.driver?.surname || ''}师傅已出发前往医院。`)
    return { ok: true, status: 'ON_THE_WAY' }
  }
  if (s === 'ON_THE_WAY') {
    const next = { ...o, status: 'IN_SERVICE' }
    next.timeline = [...o.timeline, event('PICKED', '司机', 'done', '已接到客户，前往家庭常住地')]
    store.updateOrder(id, next)
    return { ok: true, status: 'IN_SERVICE' }
  }
  if (s === 'IN_SERVICE') {
    const next = { ...o, status: 'COMPLETED' }
    next.timeline = [...o.timeline,
      event('ARRIVED', '司机', 'done', '已到达家庭常住地'),
      event('DONE', '服务商', 'done', '回单确认，服务结束')]
    store.updateOrder(id, next)
    message(o.id, '服务已完成', '行程已送达，欢迎评价本次服务。')
    return { ok: true, status: 'COMPLETED' }
  }
  return { ok: false, msg: '当前状态无需推进' }
}

function push(o, status, ev) {
  const next = { ...o, status, timeline: [...o.timeline, ev] }
  store.updateOrder(o.id, next)
  return { ok: true, status }
}

function message(orderId, title, body) {
  store.pushMessage({ type: 'system', title, body, orderId })
}

/** 演示"派单超时，平台介入" */
export function escalateOrder(id) {
  const o = store.getOrder(id)
  if (!o) return
  const next = { ...o, escalated: true }
  next.timeline = [...o.timeline, {
    code: 'ESCALATED', label: '平台介入', desc: '已超出承诺时效，平台运营介入协调运力',
    at: new Date().toISOString(), actor: '平台', level: 'warn'
  }]
  store.updateOrder(id, next)
  message(id, '平台已介入协调', '你的申请已超出承诺时效，平台运营正在协调运力，将尽快答复。')
}

/** 演示审核驳回 */
export function rejectOrder(id, reason = '就诊医院为一级医疗机构，不在本服务覆盖的二级及以上公立医院范围内') {
  const o = store.getOrder(id)
  if (!o) return
  const next = {
    ...o, status: 'CLOSED', closeReason: 'REJECTED', rejectReason: reason,
    timeline: [...o.timeline, { code: 'REJECTED', label: '审核未通过', desc: reason, at: new Date().toISOString(), actor: '平台', level: 'danger' }]
  }
  store.updateOrder(id, next)
  message(id, '申请未通过', reason)
}

/** 演示服务商反馈无车 */
export function noVehicle(id) {
  const o = store.getOrder(id)
  if (!o) return
  const next = { ...o, noVehicle: true }
  next.timeline = [...o.timeline, {
    code: 'NO_VEHICLE', label: '暂无可用车辆', desc: '属地服务商反馈该时段无合适车辆，平台正在协调其他服务商',
    at: new Date().toISOString(), actor: '服务商', level: 'warn'
  }]
  store.updateOrder(id, next)
  message(id, '正在协调其他服务商', '当前服务商暂无可用车辆，可改约或等待平台协调。')
}

/** 演示待补材料 */
export function needInfo(id) {
  const o = store.getOrder(id)
  if (!o) return
  const next = {
    ...o, status: 'NEED_INFO',
    materials: o.materials.map(m => m.type === 'hospital'
      ? { ...m, status: 'problem', remark: '照片模糊，无法识别住院日期与医生签字，请重新拍摄' }
      : m),
    timeline: [...o.timeline, {
      code: 'REVIEWING', label: '材料核验', desc: '住院材料不清晰，已发送补充通知',
      at: new Date().toISOString(), actor: '平台', level: 'warn'
    }]
  }
  store.updateOrder(id, next)
  message(id, '需要补充材料', '住院材料照片模糊，请重新上传。')
}

/** 演示司机迟到 */
export function delayDriver(id, minutes = 15) {
  const o = store.getOrder(id)
  if (!o) return
  const next = { ...o, etaDelay: minutes }
  next.timeline = [...o.timeline, {
    code: 'DELAY', label: '司机预计晚到', desc: `路况影响，预计晚到 ${minutes} 分钟`,
    at: new Date().toISOString(), actor: '司机', level: 'warn'
  }]
  store.updateOrder(id, next)
  message(id, '司机预计晚到', `因路况影响，司机预计晚到 ${minutes} 分钟。`)
}
