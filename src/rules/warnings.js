// 软提示：不阻断提交，但需要用户确认或在订单上打标
import { LONG_TRIP_KM } from './eligibility.js'
import { isWorkTime, parseYmd } from './time.js'

export function collectWarnings(form, ctx = {}) {
  const list = []
  const { now = new Date() } = ctx

  // S01 距出院不足 24 小时
  if (form.dischargeDate && form.travelDate) {
    const t = parseYmd(form.travelDate)
    const diffH = (t - now) / 3600000
    if (diffH < 24) {
      list.push({ code: 'S01', level: 'warn', title: '临近出院申请', text: '距出行不足 24 小时，平台会尽力协调，但无法保证按所选时间安排' })
    }
  }

  // S02 非服务时段提交
  if (!isWorkTime(now)) {
    list.push({ code: 'S02', level: 'info', title: '非服务时段提交', text: '当前不在工作日 9:00–21:00，申请将于下一服务时段起受理' })
  }

  // S03 出行时间不在服务时段
  if (form.travelTime) {
    const h = Number(form.travelTime.split(':')[0])
    if (h < 9 || h >= 21) {
      list.push({ code: 'S03', level: 'info', title: '出行时间在服务时段外', text: '服务时间为工作日 9:00–21:00，实际出行时间以服务商沟通为准' })
    }
  }

  // S04 里程接近 200 公里分界
  if (form.distanceKm && Math.abs(form.distanceKm - LONG_TRIP_KM) <= 20) {
    list.push({ code: 'S04', level: 'info', title: '里程接近分界', text: `测算里程 ${form.distanceKm} 公里，接近 200 公里分界，最终以最短实际行驶路线为准` })
  }

  // S05 七座车人数少
  if (form.vehicleType === 'mpv' && Number(form.passengerCount) <= 2) {
    list.push({ code: 'S05', level: 'info', title: '车型建议', text: '同行 2 人以内时，五座轿车即可满足，费用与车型无关' })
  }

  // S06 未选协助出院
  if (!form.assistDischarge) {
    list.push({ code: 'S06', level: 'info', title: '需要协助出院吗', text: '如需要协助办理出院手续、病床转移至车辆，请在上一步勾选"协助出院"' })
  }

  return list
}
