// 时间与工作日工具：服务时间为工作日 9:00-21:00（手册 11.3 服务时效第 4 条）
// 演示不接节假日日历，仅按周一至周五计算，页面注明"节假日顺延以服务商沟通为准"

export const WORK_START = 9
export const WORK_END = 21

export function isWeekend(d) {
  const w = d.getDay()
  return w === 0 || w === 6
}

export function isWorkTime(d) {
  if (isWeekend(d)) return false
  const h = d.getHours()
  return h >= WORK_START && h < WORK_END
}

export function pad(n) { return n < 10 ? '0' + n : String(n) }

export function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function ymdCn(d) {
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function parseYmd(s) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + n)
  return x
}

export function startOfDay(d) {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

export function diffDays(a, b) {
  // b - a 的自然日差
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000)
}

/** 从 from 起，往后推 n 个工作小时（9:00-21:00，周末跳过）。 */
export function addWorkHours(from, n) {
  let t = new Date(from.getTime())
  if (!isWorkTime(t)) t = nextWorkMoment(t)
  let remain = n * 60 // 分钟
  let guard = 0
  while (remain > 0 && guard < 400) {
    guard++
    const end = new Date(t.getTime())
    end.setHours(WORK_END, 0, 0, 0)
    const avail = Math.floor((end - t) / 60000)
    if (avail <= 0) { t = nextWorkMoment(t); continue }
    const use = Math.min(avail, remain)
    t = new Date(t.getTime() + use * 60000)
    remain -= use
    if (remain > 0) t = nextWorkMoment(t)
  }
  return t
}

export function nextWorkMoment(d) {
  const t = new Date(d.getTime())
  let guard = 0
  while (guard < 20) {
    guard++
    if (!isWeekend(t) && t.getHours() < WORK_START) {
      t.setHours(WORK_START, 0, 0, 0)
      return t
    }
    if (!isWeekend(t) && t.getHours() < WORK_END) return t
    t.setDate(t.getDate() + 1)
    t.setHours(WORK_START, 0, 0, 0)
    if (!isWeekend(t)) return t
  }
  return t
}

/** 两个时刻之间的工作小时数（用于判断是否满足"提前 4 工作小时通知"） */
export function workHoursBetween(a, b) {
  if (b <= a) return 0
  let t = new Date(a.getTime())
  let total = 0
  let guard = 0
  while (t < b && guard < 400) {
    guard++
    if (!isWorkTime(t)) { const nx = nextWorkMoment(t); if (nx >= b) break; t = nx; continue }
    const end = new Date(t.getTime()); end.setHours(WORK_END, 0, 0, 0)
    const nextStop = end < b ? end : b
    total += (nextStop - t) / 3600000
    t = new Date(nextStop.getTime())
    if (t < b) t = nextWorkMoment(t)
  }
  return total
}

export function formatDateTime(d) {
  if (!d) return ''
  const x = typeof d === 'string' ? new Date(d) : d
  return `${x.getMonth() + 1}月${x.getDate()}日 ${pad(x.getHours())}:${pad(x.getMinutes())}`
}

export function formatTime(d) {
  if (!d) return ''
  const x = typeof d === 'string' ? new Date(d) : d
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`
}

/** 剩余时长文案：用于 SLA 倒计时 */
export function humanRemain(ms) {
  if (ms <= 0) return '已超时'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}天${h % 24}小时`
  if (h >= 1) return `${h}小时${m}分`
  return `${m}分钟`
}
