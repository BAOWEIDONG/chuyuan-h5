import { store } from './orders.js'
import { session } from './session.js'
import { addWorkHours } from '../rules/time.js'

import { hospitalById } from '../data/hospitals.js'

function orderId() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const n = Math.floor(Math.random() * 9000 + 1000)
  return `CY${ymd}${n}`
}

export function buildOrderFromDraft(draft, address) {
  const h = hospitalById(draft.hospitalId)
  const now = new Date()
  return {
    id: orderId(),
    memberId: session.member?.memberId || 'M0001',
    memberName: session.member?.memberName || '',
    status: 'REVIEWING',
    hospital: { id: h.id, name: h.name, city: h.city, district: h.district, level: h.level, nature: h.nature },
    admissionDate: draft.admissionDate,
    dischargeDate: draft.dischargeDate,
    address,
    passengerCount: draft.passengerCount,
    travelDate: draft.travelDate,
    travelTime: draft.travelTime,
    vehicleType: draft.vehicleType,
    lieFlatRequired: draft.lieFlatRequired,
    assistDischarge: draft.assistDischarge,
    needs: [...draft.needs],
    luggage: draft.luggage,
    contact: { name: draft.contactName, phone: draft.contactPhone },
    distanceKm: draft.distanceKm,
    tripType: draft.tripType,
    materials: [
      { type: 'hospital', label: '住院材料', files: draft.materials.hospital.map(f => ({ name: f.name, size: f.size })), status: 'ok' },
      { type: 'address', label: '住址证明', files: draft.materials.address.map(f => ({ name: f.name, size: f.size })), status: 'ok' },
      { type: 'doctor', label: '平躺医嘱', files: draft.materials.doctor.map(f => ({ name: f.name, size: f.size })), status: draft.lieFlatRequired ? 'ok' : 'na' }
    ],
    provider: null,
    vehicle: null,
    driver: null,
    sla: {
      respondDeadline: addWorkHours(now, 12).toISOString(),
      confirmDeadline: addWorkHours(now, 24).toISOString()
    },
    timeline: [
      { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理，材料进入审核', at: now.toISOString(), actor: '客户', level: 'doing' }
    ],
    evaluation: null,
    cancelReason: '',
    rejectReason: '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
}

export function submitOrder(draft, address) {
  const order = buildOrderFromDraft(draft, address)
  store.addOrder(order)
  store.pushMessage({
    type: 'system',
    title: '申请已受理',
    body: `出院交通安排申请已提交，受理编号 ${order.id}，将在 12 个工作小时内完成材料响应。`,
    orderId: order.id
  })
  return order
}
