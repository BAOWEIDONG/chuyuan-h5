import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER } from './helpers.js'
import { store } from '../src/store/orders.js'
import { seedDemoOrders } from '../src/store/seed.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function openOrder(id) {
  const { wrapper } = await makeApp('/order/' + id, MEMBER)
  const end = Date.now() + 5000
  while (Date.now() < end && !bodyText().includes(id)) {
    await sleep(60)
    await settle(3)
  }
  return wrapper
}

// 订单详情里必须出现的关键字段：进行中与已结束用同一套
function expectCommonFields(text, o) {
  expect(text, '医院名').toContain(o.hospital.name)
  expect(text, '家庭常住地').toContain(o.address.city + o.address.district)
  expect(text, '社区').toContain(o.address.community)
  expect(text, '出行时间').toContain(o.travelDate)
  expect(text, '出行时间').toContain(o.travelTime)
  expect(text, '同行人数').toContain(`${o.passengerCount} 人`)
  expect(text, '里程').toContain(`${o.distanceKm} 公里`)
  expect(text, '联系人').toContain(o.contact.name)
  expect(text, '受理编号').toContain(o.id)
}

describe('订单详情：进行中与已结束信息结构一致', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    store.reset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    seedDemoOrders({ force: true })
  })

  it('已完成的详情保留医院、地址、时间、人数、里程、联系人、编号', async () => {
    // 取一条已评价的完成单，评价区必须有内容
    const o = store.orders.find(x => x.status === 'COMPLETED' && x.evaluation)
    const wrapper = await openOrder(o.id)
    const t = bodyText()
    expectCommonFields(t, o)
    expect(t).toContain('服务已完成')
    expect(t).toContain('我的评价')
    expect(t).toContain('费用')
    expect(t).toContain('权益范围内，无额外费用')
    wrapper.unmount()
  })

  it('已完成的详情展示服务商与司机车辆，不只留一行摘要', async () => {
    const o = store.orders.find(x => x.status === 'COMPLETED')
    const wrapper = await openOrder(o.id)
    const t = bodyText()
    expect(t).toContain(o.provider.name)
    expect(t).toContain(o.driver.surname + '师傅')
    expect(t).toContain(o.driver.plate)
    expect(t).toContain(o.vehicle.name)
    expect(document.querySelectorAll('.tl').length).toBeGreaterThanOrEqual(9)
    wrapper.unmount()
  })

  it('已取消的详情不再写“按需适配”，改给出结束时间与未产生费用', async () => {
    const o = store.orders.find(x => x.closeReason === 'CANCELLED')
    const wrapper = await openOrder(o.id)
    const t = bodyText()
    expectCommonFields(t, o)
    expect(t).toContain('已取消')
    expect(t).toContain('结束时间')
    expect(t).toContain('未派车')
    expect(t).toContain('未产生费用')
    wrapper.unmount()
  })

  it('与进行中订单相比字段不缺项', async () => {
    const active = store.orders.find(x => x.status === 'CONFIRMED')
    const done = store.orders.find(x => x.status === 'COMPLETED')
    const w1 = await openOrder(active.id)
    const a = bodyText()
    w1.unmount()
    const w2 = await openOrder(done.id)
    const d = bodyText()
    w2.unmount()

    for (const label of ['出发 · 医院', '到达 · 家庭常住地', '出行时间', '同行人数', '测算里程', '受理时间']) {
      expect(a, `进行中缺少 ${label}`).toContain(label)
      expect(d, `已完成缺少 ${label}`).toContain(label)
    }
    // 服务商卡片两边都要有
    expect(a).toContain(active.provider.name)
    expect(d).toContain(done.provider.name)
  })
})
