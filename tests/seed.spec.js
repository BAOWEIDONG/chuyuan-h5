import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER } from './helpers.js'
import { store } from '../src/store/orders.js'
import { seedDemoOrders, SEED_VERSION } from '../src/store/seed.js'
import { TIMELINE_STEPS, STATUS_META } from '../src/rules/status.js'
import { activeOrder } from '../src/store/orders.js'

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

describe('示例服务记录：进行中状态 + 评价', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    store.reset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('灌入后进行中 2 条、已结束 5 条，且日期不落在过去', () => {
    expect(seedDemoOrders({ force: true })).toBe(true)
    const all = store.orders
    expect(all.length).toBe(7)

    const active = all.filter(o => !['COMPLETED', 'CLOSED'].includes(o.status))
    expect(active.length).toBe(2)
    expect(active.map(o => o.status).sort()).toEqual(['CONFIRMED', 'DISPATCHING'])

    // 进行中的出行日期必须还在未来，否则打开就是过期单
    for (const o of active) {
      expect(new Date(o.travelDate + 'T00:00:00') >= new Date(new Date().toDateString())).toBe(true)
    }

    expect(all.filter(o => o.status === 'COMPLETED').length).toBe(3)
    expect(all.filter(o => o.evaluation).length).toBe(2)
    expect(all.filter(o => o.status === 'COMPLETED' && !o.evaluation).length).toBe(1)
    expect(all.some(o => o.closeReason === 'CANCELLED')).toBe(true)
    expect(all.some(o => o.closeReason === 'REJECTED')).toBe(true)
  })

  it('已完成订单的评价与评分自洽，服务商与车辆齐全', () => {
    seedDemoOrders({ force: true })
    for (const o of store.orders.filter(x => x.status === 'COMPLETED')) {
      expect(o.provider?.name, `${o.id} 缺少服务商`).toBeTruthy()
      expect(o.vehicle?.name, `${o.id} 缺少车型`).toBeTruthy()
      expect(o.driver?.plate, `${o.id} 缺少司机`).toBeTruthy()
      if (o.evaluation) {
        expect(o.evaluation.rating).toBeGreaterThanOrEqual(1)
        expect(o.evaluation.rating).toBeLessThanOrEqual(5)
        expect(o.evaluation.tags.length).toBeGreaterThan(0)
      }
    }
  })

  it('时间轴节点符合标准顺序，且时间不倒流', () => {
    seedDemoOrders({ force: true })
    const order = store.orders.find(o => o.evaluation?.rating === 5)
    const codes = order.timeline.map(t => t.code)
    expect(codes).toEqual(['SUBMITTED', 'REVIEWED', 'DISPATCHED', 'CONFIRMED', 'REMINDED', 'DEPARTED', 'PICKED', 'ARRIVED', 'DONE'])
    for (const c of codes) expect(TIMELINE_STEPS.some(s => s.code === c)).toBe(true)
    const times = order.timeline.map(t => new Date(t.at).getTime())
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1])
  })

  it('进行中订单的节点停在当前状态，不会提前出现完成节点', () => {
    seedDemoOrders({ force: true })
    const o = store.orders.find(x => x.status === 'DISPATCHING')
    const codes = o.timeline.map(t => t.code)
    expect(codes).toContain('DISPATCHED')
    expect(codes).not.toContain('CONFIRMED')
    expect(codes).not.toContain('DONE')
    // 当前节点应是进行中，而不是已完成
    expect(o.timeline[o.timeline.length - 1].level).toBe('doing')
  })

  it('版本升级会替换示例数据，但保留用户自己生成的订单', () => {
    seedDemoOrders({ force: true })
    const before = store.orders.length
    store.addOrder({ id: 'MINE1', status: 'REVIEWING', timeline: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

    // 模拟老版本：把版本号抹掉
    localStorage.removeItem('cy_seed_v')
    expect(seedDemoOrders()).toBe(true)
    expect(store.orders.length).toBe(before + 1)
    expect(store.getOrder('MINE1')).toBeTruthy()
    expect(localStorage.getItem('cy_seed_v')).toBe(String(SEED_VERSION))

    // 版本一致时不再重复灌
    expect(seedDemoOrders()).toBe(false)
  })

  it('服务记录页同时展示进行中与已结束', async () => {
    seedDemoOrders({ force: true })
    const { wrapper, text } = await pageText('/orders')
    expect(text).toContain('服务记录')
    expect(text).toContain('已确认')
    expect(text).toContain('派单中')
    expect(text).toContain('已完成')
    expect(text).toContain('去评价')
    for (const o of store.orders) expect(text).toContain(o.id)
    wrapper.unmount()
  })

  it('筛选：进行中 2 条、已结束 5 条', async () => {
    seedDemoOrders({ force: true })
    const { wrapper } = await makeApp('/orders', MEMBER)
    await settle(6)
    const tabs = [...document.querySelectorAll('.tab')]
    tabs[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await sleep(120)
    await settle(3)
    let t = bodyText()
    expect(t).not.toContain('还没有服务记录')
    for (const o of store.orders.filter(x => !['COMPLETED', 'CLOSED'].includes(x.status))) {
      expect(t).toContain(o.id)
    }
    for (const o of store.orders.filter(x => ['COMPLETED', 'CLOSED'].includes(x.status))) {
      expect(t).not.toContain(o.id)
    }

    tabs[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await sleep(120)
    await settle(3)
    t = bodyText()
    for (const o of store.orders.filter(x => ['COMPLETED', 'CLOSED'].includes(x.status))) {
      expect(t).toContain(o.id)
    }
    wrapper.unmount()
  })

  it('首页展示进行中的订单，并提示待评价的那一单', async () => {
    seedDemoOrders({ force: true })
    expect(activeOrder.value).toBeTruthy()
    const { wrapper, text } = await pageText('/')
    expect(text).toContain('已确认')
    expect(text).toContain(activeOrder.value.hospital.name)
    expect(text).toContain('给个评价吧')
    expect(text).toContain('共 7 条')
    wrapper.unmount()
  })

  it('已完成订单详情展示评价原文，并列出全部进度节点', async () => {
    seedDemoOrders({ force: true })
    const o = store.orders.find(x => x.evaluation?.rating === 5)
    const { wrapper, text } = await pageText('/order/' + o.id)
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
    const o = store.orders.find(x => x.status === 'COMPLETED' && !x.evaluation)
    const { wrapper, text } = await pageText('/order/' + o.id)
    expect(text).toContain(STATUS_META.COMPLETED.label)
    expect(text).toContain('评价本次服务')
    wrapper.unmount()
  })
})
