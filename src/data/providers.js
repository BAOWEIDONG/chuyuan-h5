// 服务商与运力：演示数据，真实项目由调度系统下发
export const PROVIDERS = [
  {
    id: 'P01', name: '安康转运服务有限公司', short: '安康转运',
    level: 'A', rating: 4.9, orders: 12840,
    tags: ['道路运输经营许可', '车辆合规备案', '司机持证上岗'],
    cities: ['北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '武汉', '西安']
  },
  {
    id: 'P02', name: '途安医疗护送服务中心', short: '途安护送',
    level: 'A', rating: 4.8, orders: 9632,
    tags: ['道路运输经营许可', '车辆合规备案', '司机持证上岗', '平躺车运力'],
    cities: ['北京', '天津', '济南', '青岛', '郑州', '合肥', '长沙', '重庆']
  },
  {
    id: 'P03', name: '易行汽车服务有限公司', short: '易行出行',
    level: 'B', rating: 4.7, orders: 5210,
    tags: ['道路运输经营许可', '车辆合规备案'],
    cities: ['上海', '杭州', '宁波', '温州', '绍兴', '嘉兴', '苏州', '无锡', '常州', '南通']
  },
  {
    id: 'P04', name: '康程非急救转运有限公司', short: '康程转运',
    level: 'A', rating: 4.9, orders: 7315,
    tags: ['道路运输经营许可', '车辆合规备案', '司机持证上岗', '平躺车运力', '担架设备'],
    cities: ['成都', '重庆', '西安', '昆明', '贵阳', '南宁', '长沙', '武汉']
  },
  {
    id: 'P05', name: '顺达出行服务有限公司', short: '顺达出行',
    level: 'B', rating: 4.6, orders: 3877,
    tags: ['道路运输经营许可', '车辆合规备案'],
    cities: ['广州', '深圳', '东莞', '佛山', '中山', '珠海', '惠州']
  },
  {
    id: 'P06', name: '北方畅行汽车服务有限公司', short: '北方畅行',
    level: 'B', rating: 4.5, orders: 2890,
    tags: ['道路运输经营许可', '车辆合规备案', '司机持证上岗'],
    cities: ['沈阳', '大连', '长春', '哈尔滨', '石家庄', '太原', '唐山', '郑州']
  }
]

export const VEHICLES = {
  sedan: [
    { id: 'V-S1', type: 'sedan', name: '五座轿车 · 大众帕萨特', seats: 5, luggage: 3, wheelchair: false, lieFlat: false, desc: '适合可自主行走、行李不多的客户' },
    { id: 'V-S2', type: 'sedan', name: '五座轿车 · 丰田凯美瑞', seats: 5, luggage: 3, wheelchair: false, lieFlat: false, desc: '车内空间宽敞，乘坐舒适' }
  ],
  mpv: [
    { id: 'V-M1', type: 'mpv', name: '七座商务车 · 别克GL8', seats: 7, luggage: 5, wheelchair: true, lieFlat: false, desc: '空间大，可放置轮椅，适合家属同行' },
    { id: 'V-M2', type: 'mpv', name: '七座商务车 · 丰田赛那', seats: 7, luggage: 5, wheelchair: true, lieFlat: false, desc: '侧滑门，上下车方便' }
  ],
  lieflat: [
    { id: 'V-L1', type: 'lieflat', name: '平躺车 · 福特全顺改装', seats: 4, luggage: 4, wheelchair: true, lieFlat: true, desc: '可平躺，配备固定担架与安全带' },
    { id: 'V-L2', type: 'lieflat', name: '非急救转运车 · 大通V90', seats: 5, luggage: 5, wheelchair: true, lieFlat: true, desc: '配备担架、氧气袋固定位，需医嘱证明' }
  ]
}

export const DRIVERS = [
  { id: 'D01', surname: '王', years: 8, certified: true, plate: '京A·8K2**', phone: '138****6621' },
  { id: 'D02', surname: '李', years: 6, certified: true, plate: '沪B·3F7**', phone: '139****3087' },
  { id: 'D03', surname: '张', years: 11, certified: true, plate: '粤A·9M1**', phone: '136****4472' },
  { id: 'D04', surname: '陈', years: 5, certified: true, plate: '川A·5T6**', phone: '137****9134' },
  { id: 'D05', surname: '刘', years: 9, certified: true, plate: '苏A·2H8**', phone: '135****2250' }
]

export function providersForCity(city) {
  const list = PROVIDERS.filter(p => p.cities.includes(city))
  return list.length ? list : [PROVIDERS[1]]
}

export function providerById(id) {
  return PROVIDERS.find(p => p.id === id) || PROVIDERS[0]
}
