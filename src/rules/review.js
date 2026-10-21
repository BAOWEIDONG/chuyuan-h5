// 服务评价的标签与文案：评价页与订单详情共用一份，避免两处对不上
export const REVIEW_TAGS = [
  { value: 'ontime', label: '准时到达' },
  { value: 'driver', label: '司机专业' },
  { value: 'clean', label: '车辆整洁' },
  { value: 'comm', label: '沟通顺畅' },
  { value: 'help', label: '上下车有帮手' },
  { value: 'quiet', label: '安静不打扰' }
]

export const RATING_TEXT = ['', '很不满意', '不满意', '一般', '满意', '非常满意']

export function tagLabel(v) {
  return REVIEW_TAGS.find(t => t.value === v)?.label || v
}
