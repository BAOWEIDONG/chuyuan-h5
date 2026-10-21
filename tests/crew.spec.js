import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER } from './helpers.js'
import { store } from '../src/store/orders.js'
import { loadScenario } from '../src/store/demo.js'
import { plateForCity } from '../src/data/providers.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function openOrder(id) {
  const { wrapper } = await makeApp('/order/' + id, MEMBER)
  const end = Date.now() + 4000
  while (Date.now() < end && !bodyText().includes(id)) {
    await sleep(50)
    await settle(3)
  }
  return wrapper
}

describe('订单详情：车辆与司机在进度节点里可见', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    store.reset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('车牌按医院城市生成，且只遮中间两位、保留首尾', () => {
    // 只遮中间：客户到场要能认出是哪辆车
    expect(plateForCity('合肥', 0)).toBe('皖A·8K**3')
    expect(plateForCity('北京', 0)).toBe('京A·8K**3')
    const o = loadScenario('confirmed')
    expect(o.driver.plate.startsWith('皖A')).toBe(true)
    // 格式：地区码 + 前两位 + ** + 末一位
    expect(o.driver.plate).toMatch(/^皖A·[A-Z0-9]{2}\*\*[A-Z0-9]$/)
    // 中间两位必须被遮住，首尾必须还在
    const serial = o.driver.plate.split('·')[1]
    expect(serial.slice(2, 4)).toBe('**')
    expect(serial[0]).not.toBe('*')
    expect(serial.slice(-1)).not.toBe('*')
  })

  it('已确认订单：服务确认节点里带车牌、车型、司机与联系按钮', async () => {
    const o = loadScenario('confirmed')
    const wrapper = await openOrder(o.id)
    const t = bodyText()
    expect(t).toContain('服务确认')
    expect(t).toContain(o.driver.plate)
    expect(t).toContain(o.vehicle.name)
    expect(t).toContain(`${o.driver.surname}师傅`)
    expect(t).toContain('持证上岗')
    expect(t).toContain('联系司机')
    // 司机真实号码不能被展示出来
    expect(t).not.toContain('1386666')
    expect(t).not.toContain('138****6621')
    // 同一屏只出现一张车辆卡
    expect(document.querySelectorAll('.crew').length).toBe(1)
    wrapper.unmount()
  })

  it('车辆出发订单：卡片跟着最新节点走，并标记实时', async () => {
    const o = loadScenario('ontheway')
    const wrapper = await openOrder(o.id)
    const t = bodyText()
    expect(t).toContain('车辆出发')
    expect(t).toContain(o.driver.plate)
    expect(t).toContain('实时')
    expect(document.querySelectorAll('.crew').length).toBe(1)
    // 卡片应挂在"车辆出发"节点之后，而不是服务确认后面
    const crews = [...document.querySelectorAll('.tl')]
      .filter(el => el.querySelector('.crew'))
      .map(el => el.querySelector('.tl-label')?.textContent.trim())
    expect(crews).toEqual(['车辆出发'])
    wrapper.unmount()
  })

  it('审核中的订单不提前暴露车辆信息', async () => {
    const o = loadScenario('short')
    const wrapper = await openOrder(o.id)
    expect(document.querySelectorAll('.crew').length).toBe(0)
    expect(bodyText()).not.toContain('联系司机')
    wrapper.unmount()
  })
})
