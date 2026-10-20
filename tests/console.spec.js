import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER, click, q } from './helpers.js'
import { store } from '../src/store/orders.js'
import { SCENARIOS } from '../src/store/demo.js'
import { advanceOrder, escalateOrder, rejectOrder, noVehicle, needInfo, delayDriver } from '../src/store/advance.js'
import { STATUS_META, CLOSE_REASON, canTransition } from '../src/rules/status.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

describe('演示控制台：9 个场景 + 状态推进', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    store.reset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('场景清单完整，每个场景都能渲染订单详情', async () => {
    expect(SCENARIOS.length).toBe(9)
    const { wrapper, router } = await makeApp('/demo', MEMBER)
    await settle(8)
    const t = bodyText()
    for (const s of SCENARIOS) expect(t).toContain(s.name)

    for (const s of SCENARIOS) {
      const o = SCENARIOS.find(x => x.key === s.key).build()
      store.addOrder(o)
      await router.push('/demo')
      await sleep(40)
      await settle(4)
      await router.push('/order/' + o.id)
      const end = Date.now() + 4000
      while (Date.now() < end && !bodyText().includes(o.hospital.name)) {
        await sleep(60)
        await settle(3)
      }
      const body = bodyText()
      expect(body, `场景 ${s.key} 详情应包含医院`).toContain(o.hospital.name)
      // 状态文案必须出现（已完成/已结束订单走另一套版式）
      const label = o.status === 'CLOSED' ? (CLOSE_REASON[o.closeReason] || '已结束') : STATUS_META[o.status].label
      expect(body, `场景 ${s.key} 应显示状态「${label}」`).toContain(label)
    }
    wrapper.unmount()
  }, 30000)

  it('推进链路符合状态机：审核中 → 派单 → 已确认 → 出发 → 服务中 → 完成', () => {
    const o = SCENARIOS.find(s => s.key === 'short').build()
    store.addOrder(o)
    const seen = []
    for (let i = 0; i < 6; i++) {
      const r = advanceOrder(o.id)
      if (!r.ok) break
      const cur = store.getOrder(o.id)
      if (seen.length) expect(canTransition(seen[seen.length - 1], cur.status)).toBe(true)
      seen.push(cur.status)
    }
    expect(seen).toEqual(['DISPATCHING', 'CONFIRMED', 'ON_THE_WAY', 'IN_SERVICE', 'COMPLETED'])
    const done = store.getOrder(o.id)
    expect(done.provider).toBeTruthy()
    expect(done.driver).toBeTruthy()
    expect(done.timeline.some(t => t.code === 'DONE')).toBe(true)
    // 完成后不再推进
    expect(advanceOrder(o.id).ok).toBe(false)
  })

  it('异常分支：超时介入 / 无车 / 补材料 / 驳回 / 晚到 都会写进时间轴并发消息', () => {
    const mk = () => {
      const o = SCENARIOS.find(s => s.key === 'dispatching').build()
      store.addOrder(o)
      return o
    }
    store.reset()
    let o = mk()
    escalateOrder(o.id)
    expect(store.getOrder(o.id).escalated).toBe(true)

    store.reset()
    o = mk()
    noVehicle(o.id)
    expect(store.getOrder(o.id).noVehicle).toBe(true)

    store.reset()
    o = mk()
    const before = store.messages.length
    rejectOrder(o.id)
    const r = store.getOrder(o.id)
    expect(r.status).toBe('CLOSED')
    expect(r.closeReason).toBe('REJECTED')
    expect(r.timeline.some(t => t.code === 'REJECTED')).toBe(true)
    expect(store.messages.length).toBeGreaterThan(before)

    store.reset()
    const c = SCENARIOS.find(s => s.key === 'confirmed').build()
    store.addOrder(c)
    needInfo(c.id)
    expect(store.getOrder(c.id).status).toBe('NEED_INFO')
    delayDriver(c.id, 20)
    expect(store.getOrder(c.id).etaDelay).toBe(20)
  })

  it('超时派单会在订单页出现平台介入提示', async () => {
    const o = SCENARIOS.find(s => s.key === 'dispatching').build()
    o.sla = { respondDeadline: new Date(Date.now() - 3600e3).toISOString(), confirmDeadline: new Date(Date.now() - 600e3).toISOString() }
    store.addOrder(o)
    const { wrapper, router } = await makeApp('/orders', MEMBER)
    await router.push('/order/' + o.id)
    await sleep(60)
    await settle(10)
    expect(bodyText()).toContain('平台已介入协调')
    wrapper.unmount()
  })
})
