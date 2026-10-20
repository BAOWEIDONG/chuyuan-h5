// 订单状态机：9 个用户可见状态 + 4 个终态原因
export const STATUS = {
  DRAFT: 'DRAFT',
  REVIEWING: 'REVIEWING',
  NEED_INFO: 'NEED_INFO',
  DISPATCHING: 'DISPATCHING',
  CONFIRMED: 'CONFIRMED',
  ON_THE_WAY: 'ON_THE_WAY',
  IN_SERVICE: 'IN_SERVICE',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED'
}

export const STATUS_META = {
  DRAFT: { label: '待提交', tone: 'muted', step: 0 },
  REVIEWING: { label: '审核中', tone: 'active', step: 1 },
  NEED_INFO: { label: '待补材料', tone: 'warn', step: 1 },
  DISPATCHING: { label: '派单中', tone: 'active', step: 2 },
  CONFIRMED: { label: '已确认', tone: 'active', step: 3 },
  ON_THE_WAY: { label: '车辆前往医院', tone: 'active', step: 4 },
  IN_SERVICE: { label: '服务中', tone: 'active', step: 5 },
  COMPLETED: { label: '已完成', tone: 'done', step: 6 },
  CLOSED: { label: '已结束', tone: 'muted', step: -1 }
}

export const CLOSE_REASON = {
  REJECTED: '审核未通过',
  CANCELLED: '已取消',
  EXPIRED: '已失效',
  USED: '本住院服务已使用'
}

// 允许的流转，越界即报错（防止演示控制台推进出非法状态）
export const TRANSITIONS = {
  DRAFT: ['REVIEWING', 'CLOSED'],
  REVIEWING: ['NEED_INFO', 'DISPATCHING', 'CLOSED'],
  NEED_INFO: ['REVIEWING', 'CLOSED'],
  DISPATCHING: ['CONFIRMED', 'CLOSED'],
  CONFIRMED: ['ON_THE_WAY', 'CLOSED'],
  ON_THE_WAY: ['IN_SERVICE', 'CLOSED'],
  IN_SERVICE: ['COMPLETED', 'CLOSED'],
  COMPLETED: [],
  CLOSED: []
}

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to)
}

export const TIMELINE_STEPS = [
  { code: 'SUBMITTED', label: '提交申请', desc: '申请已受理，材料进入审核' },
  { code: 'REVIEWED', label: '审核通过', desc: '服务条件与材料核验通过' },
  { code: 'DISPATCHED', label: '派单', desc: '按医院与目的地匹配属地运力' },
  { code: 'CONFIRMED', label: '服务确认', desc: '服务商接单，车辆与人员已锁定' },
  { code: 'REMINDED', label: '行前提醒', desc: '出行前确认时间与上车地点' },
  { code: 'DEPARTED', label: '车辆出发', desc: '车辆前往医院' },
  { code: 'PICKED', label: '接到客户', desc: '已完成出院手续与上车' },
  { code: 'ARRIVED', label: '送达目的地', desc: '已到达家庭常住地' },
  { code: 'DONE', label: '服务完成', desc: '回单确认，服务结束' }
]
