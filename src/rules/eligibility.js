// 规则引擎：所有校验集中在此，页面只负责调用与展示
// 规则编号与 PRD v0.1 第四节一一对应
import { isCityCovered } from '../data/cities.js'
import { CITY_COORDS } from '../data/coords.js'
import { diffDays, parseYmd, addDays, isWorkTime, ymdCn } from './time.js'

export const LONG_TRIP_KM = 200
const ROAD_FACTOR = 1.25

/** 演示用里程：城市中心点直线距离 × 道路系数，四舍五入到 5 公里 */
export function estimateDistance(fromCity, toCity) {
  const a = CITY_COORDS[fromCity]
  const b = CITY_COORDS[toCity]
  if (!a || !b) return null
  const R = 6371
  const toRad = v => (v * Math.PI) / 180
  const [lat1, lon1] = a
  const [lat2, lon2] = b
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const km = 2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR
  return Math.round(km / 5) * 5
}

export function tripTypeOf(km) {
  return km > LONG_TRIP_KM ? 'long' : 'short'
}

/** R01 / R02 医院合规 */
export function checkHospital(hospital) {
  if (!hospital) return null
  if (!isCityCovered(hospital.city)) {
    return { code: 'R02', text: `该城市暂未开通服务，可拨打 95511-7 查询最新服务城市` }
  }
  if (hospital.level === '一级' || /^一级/.test(hospital.level)) {
    return { code: 'R01', text: `本服务仅支持二级及以上公立医院，${hospital.name} 不在服务范围` }
  }
  if (hospital.nature !== '公立') {
    return { code: 'R01', text: `本服务仅支持公立医院，${hospital.name} 不在服务范围` }
  }
  return null
}

/** R03 / R05 住院与出院日期 */
export function checkStay(admissionDate, dischargeDate, today = new Date()) {
  const errs = []
  if (!admissionDate || !dischargeDate) return errs
  const a = parseYmd(admissionDate)
  const b = parseYmd(dischargeDate)
  if (b < a) {
    errs.push({ code: 'R03', text: '出院日期不能早于入院日期' })
    return errs
  }
  if (diffDays(a, b) < 1) {
    errs.push({ code: 'R03', text: '同一次住院需满 2 个自然日，当日出入院无法提供服务' })
  }
  // R05 提前 7 天以上不支持
  const daysAhead = diffDays(today, b)
  if (daysAhead > 7) {
    errs.push({ code: 'R05', text: '暂不支持提前 7 天以上预约，请在出院日前 7 天内提交' })
  }
  return errs
}

/** R04 出行日期区间 [出院日, 出院日+2] */
export function allowedTravelDates(dischargeDate) {
  const d = parseYmd(dischargeDate)
  if (!d) return []
  return [0, 1, 2].map(n => addDays(d, n))
}

export function checkTravelDate(dischargeDate, travelDate) {
  if (!dischargeDate || !travelDate) return null
  const end = addDays(parseYmd(dischargeDate), 2)
  const t = parseYmd(travelDate)
  if (t < parseYmd(dischargeDate) || t > end) {
    return { code: 'R04', text: `本服务仅限出院当天及之后 2 个自然日内使用，可选 ${ymdCn(parseYmd(dischargeDate))} 至 ${ymdCn(end)}` }
  }
  return null
}

/** R08 长途人数上限 */
export function checkPassengers(tripType, count) {
  if (tripType === 'long' && count > 2) {
    return { code: 'R08', text: '长途仅承担被保人及 1 名家属，超出人员需自行安排' }
  }
  if (tripType !== 'long' && count > 6) {
    return { code: 'R08', text: '短途用车最多 7 座，同行人数超过 6 人时需自行安排额外车辆' }
  }
  return null
}

/** R09 平躺需医生证明 */
export function checkLieFlat(vehicleType, hasDoctorProof) {
  if (vehicleType === 'lieflat' && !hasDoctorProof) {
    return { code: 'R09', text: '平躺需求需上传主诊医生开具的证明后方可安排' }
  }
  return null
}

/** 资格问答（R11 / R12） */
export const ELIGIBILITY_QUESTIONS = [
  {
    key: 'scene',
    title: '这次用车是什么场景？',
    desc: '请选择最接近的一项',
    options: [
      { value: 'home', label: '出院后回家庭常住地', ok: true },
      { value: 'transfer', label: '转到另一家医院继续治疗', ok: false, reason: '转院属于医疗转运，不在本服务范围' },
      { value: 'rehab', label: '去康复机构、养老机构', ok: false, reason: '康复机构接送不在本服务范围' },
      { value: 'trip', label: '探亲、旅游、疗养等出行', ok: false, reason: '非出院场景不在本服务范围' }
    ]
  },
  {
    key: 'condition',
    title: '目前病情是否稳定？',
    desc: '以主诊医生评估为准',
    options: [
      { value: 'stable', label: '病情稳定，可自主或搀扶行走', ok: true },
      { value: 'support', label: '需要输液、吸氧、心电监护', ok: false, reason: '需要医疗支持的情况不适用本服务，建议联系医院安排救护车' },
      { value: 'critical', label: '病情危重或主动放弃治疗', ok: false, reason: '高危情况出院不符合服务条件，建议联系医院安排救护车' }
    ]
  },
  {
    key: 'discharge',
    title: '是否已经出院？',
    desc: '服务须在出院前申请',
    options: [
      { value: 'before', label: '还没有出院，正在住院', ok: true },
      { value: 'after', label: '已经出院了', ok: false, reason: '出院后无法申请，自行安排交通视为放弃服务' }
    ]
  }
]
