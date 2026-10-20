import { reactive, watch } from 'vue'
import { estimateDistance, tripTypeOf } from '../rules/eligibility.js'

const KEY = 'cy_draft'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

function blank() {
  return {
    hospitalId: '',
    admissionDate: '',
    dischargeDate: '',
    address: null,
    passengerCount: 2,
    travelDate: '',
    travelTime: '',
    vehicleType: 'V-S1',
    lieFlatRequired: false,
    assistDischarge: false,
    needs: [],
    contactName: '',
    contactPhone: '',
    luggage: 2,
    note: '',
    materials: { hospital: [], address: [], doctor: [] },
    agreed: false,
    distanceKm: null,
    tripType: 'short',
    eligibility: null,
    updatedAt: null
  }
}

export function newDraft() {
  return reactive(blank())
}

export const draft = reactive(load() || blank())

// 草稿自动保存，退出可续填
watch(
  () => JSON.stringify(draft),
  () => {
    draft.updatedAt = new Date().toISOString()
    localStorage.setItem(KEY, JSON.stringify(draft))
  },
  { deep: true }
)

export function resetDraft() {
  Object.assign(draft, blank())
  localStorage.removeItem(KEY)
}

export function clearDraft() {
  Object.assign(draft, blank())
  localStorage.removeItem(KEY)
}

/** 依据医院城市与常住地城市测算里程，更新短途/长途 */
export function recomputeTrip(hospitalCity, addressCity) {
  if (!hospitalCity || !addressCity) {
    draft.distanceKm = null
    draft.tripType = 'short'
    return
  }
  const km = estimateDistance(hospitalCity, addressCity)
  // 同城接送按市内平均 15 公里估算；跨城用城市中心点测算
  draft.distanceKm = km ? km : 15
  draft.tripType = tripTypeOf(km || 0)
  if (draft.tripType === 'long') {
    draft.vehicleType = 'train'
    draft.passengerCount = Math.min(draft.passengerCount, 2)
  }
}
