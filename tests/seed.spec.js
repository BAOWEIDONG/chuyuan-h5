import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER } from './helpers.js'
import { store } from '../src/store/orders.js'
import { seedDemoOrders } from '../src/store/seed.js'
import { TIMELINE_STEPS, STATUS_META } from '../src/rules/status.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function pageText(path) {
  const { wrapper } = await makeApp(path, MEMBER)
  const end = Date.now() + 4000
  while (Date.now() < end && bodyText().length < 40) {
    await sleep(50)
    await settle(3)
  }
  return { wrapper, text: bodyText() }
}

describe('示例服务记录：状态跟踪与评价', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    store.reset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('灌入 5 条记录，覆盖已评价/待评价/已取消/未通过', () => {
    expect(seedDemoOrders({ force: true })).toBe(true)
    const all = store.orders
    expect(all.length).toBe(5)
    expect(all.filter(o => o.status === 'COMPLETED').length).toBe(3)
    expect(all.filter(o => o.evaluation && !o.evaluation.skipped).length).toBe(2)
    expect(all.filter(o => o.status === 'COMPLETED' && !o.evaluation).length).toBe(1)
    expect(all.some(o => o.closeReason === 'CANCELLED')).toBe(true)
    expect(all.some(o => o.closeReason === 'REJECTED')).toBe(true)
    // 评价内容要与评分、标签自洽
    for (const o of all.filter(x => x.evaluation && !x.evaluation.skipped)) {
      expect(o.evaluation.rating).toBeGreaterThanOrEqual(1)
      expect(o.evaluation.rating).toBeLessThanOrEqual(5)
      expect(o.evaluation.tags.length).toBeGreaterThan(0)
    }
    // 已完成的单必须有服务商与车辆，否则详情页会空
    for (const o of all.filter(x => x.status === 'COMPLETED')) {
      expect(o.provider?.name, `${o.id} 缺少服务商`).toBeTruthy()
      expect(o.vehicle?.name, `${o.id} 缺少车型`).toBeTruthy()
      expect(o.driver?.plate, `${o.id} 缺少司机`).toBeTruthy()
    }
  })

  it('时间轴节点符合标准顺序，且时间不倒流', () => {
    seedDemoOrders({ force: true })
    const order = store.orders.find(o => o.id === 'CY2610120846')
    const codes = order.timeline.map(t => t.code)
    const expected = ['SUBMITTED', 'REVIEWED', 'DISPATCHED', 'CONFIRMED', 'REMINDED', 'DEPARTED', 'PICKED', 'ARRIVED', 'DONE']
    expect(codes).toEqual(expected)
    // 每个节点都要是标准节点，避免详情页出现孤立的额外节点
    for (const c of codes) expect(TIMELINE_STEPS.some(s => s.code === c)).toBe(true)
    const times = order.timeline.map(t => new Date(t.at).getTime())
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1])
    // 送达时间要早于服务完成
    const arrive = order.timeline.find(t => t.code === 'ARRIVED')
    const done = order.timeline.find(t => t.code === 'DONE')
    expect(new Date(done.at) > new Date(arrive.at)).toBe(true)
  })

  it('已有记录时不覆盖', () => {
    seedDemoOrders({ force: true })
    const before = store.orders.length
    store.addOrder({ id: 'MINE1', status: 'REVIEWING', timeline: [] })
    expect(seedDemoOrders()).toBe(false)
    expect(store.orders.length).toBe(before + 1)
    expect(store.getOrder('MINE1')).toBeTruthy()
  })

  it('服务记录页展示状态、星级与去评价入口', async () => {
    seedDemoOrders({ force: true })
    const { wrapper, text } = await pageText('/orders')
    expect(text).toContain('服务记录')
    expect(text).toContain('已完成')
    expect(text).toContain('已取消')
    expect(text).toContain('审核未通过')
    expect(text).toContain('已评价')
    expect(text).toContain('去评价')
    // 五条记录都要在列表里
    for (const o of store.orders) expect(text).toContain(o.id)
    wrapper.unmount()
  })

  it('状态筛选：进行中为空、已结束为 5 条', async () => {
    seedDemoOrders({ force: true })
    const { wrapper } = await makeApp('/orders', MEMBER)
    await settle(6)
    const tabs = [...document.querySelectorAll('.tab')]
    expect(tabs.length).toBe(3)
    tabs[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await sleep(120)
    await settle(3)
    expect(bodyText()).toContain('还没有服务记录')
    tabs[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await sleep(120)
    await settle(3)
    const t = bodyText()
    expect(t).not.toContain('还没有服务记录')
    for (const o of store.orders) expect(t).toContain(o.id)
    wrapper.unmount()
  })

  it('首页提示本次出行待评价', async () => {
    seedDemoOrders({ force: true })
    const { wrapper, text } = await pageText('/')
    expect(text).toContain('给个评价吧')
    expect(text).toContain('去评价')
    wrapper.unmount()
  })

  it('已完成订单详情展示评价原文，并列出全部进度节点', async () => {
    seedDemoOrders({ force: true })
    const { wrapper, text } = await pageText('/order/CY2609180317')
    expect(text).toContain('服务已完成')
    expect(text).toContain('我的评价')
    expect(text).toContain('非常满意')
    expect(text).toContain('准时到达')
    expect(text).toContain('师傅提前二十分钟到病房楼下')
    for (const s of TIMELINE_STEPS) expect(text, `缺少节点 ${s.label}`).toContain(s.label)
    wrapper.unmount()
  })

  it('待评价订单详情给出评价按钮', async () => {
    seedDemoOrders({ force: true })
    const { wrapper, text } = await pageText('/order/CY2610120846')
    expect(text).toContain(STATUS_META.COMPLETED.label)
    expect(text).toContain('评价本次服务')
    wrapper.unmount()
  })
})
