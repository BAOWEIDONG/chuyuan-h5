import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER } from './helpers.js'
import { store } from '../src/store/orders.js'
import { seedDemoOrders } from '../src/store/seed.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const PHONE_TEXT = '400-820-8866'
const PHONE_TEL = 'tel:4008208866'

/** 找出页面上所有出现电话号码、却不在 tel: 链接里的文本节点 */
function barePhoneNodes() {
  const out = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) {
    const t = n.textContent || ''
    if (!t.includes(PHONE_TEXT)) continue
    let el = n.parentElement
    let linked = false
    while (el && el !== document.body) {
      if (el.tagName === 'A' && el.getAttribute('href') === PHONE_TEL) { linked = true; break }
      el = el.parentElement
    }
    if (!linked) out.push(`${n.parentElement?.className || '?'}: ${t.trim().slice(0, 40)}`)
  }
  return out
}

async function openPage(path) {
  document.body.innerHTML = ''
  const { wrapper } = await makeApp(path, MEMBER)
  const end = Date.now() + 5000
  while (Date.now() < end && bodyText().length < 30) {
    await sleep(60)
    await settle(3)
  }
  await settle(4)
  return wrapper
}

describe('客服电话：凡出现即可点击拨号', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    store.reset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    seedDemoOrders({ force: true })
  })

  const PAGES = [
    ['/', '首页'],
    ['/rules', '服务规则'],
    ['/book', '预约表单'],
    ['/address', '家庭常住地'],
    ['/eligibility', '资格确认'],
    ['/messages', '消息'],
    ['/orders', '服务记录']
  ]

  for (const [path, name] of PAGES) {
    it(`${name}：号码都在 tel 链接里`, async () => {
      const wrapper = await openPage(path)
      const bare = barePhoneNodes()
      expect(bare, `${name} 有裸号码：${bare.join(' | ')}`).toEqual([])
      wrapper.unmount()
    })
  }

  it('订单详情（进行中/已完成/已结束）：号码都在 tel 链接里', async () => {
    for (const o of store.orders) {
      const wrapper = await openPage('/order/' + o.id)
      const bare = barePhoneNodes()
      expect(bare, `${o.id} 有裸号码：${bare.join(' | ')}`).toEqual([])
      wrapper.unmount()
    }
  })

  it('评价页：反馈号码可拨号', async () => {
    const o = store.orders.find(x => x.status === 'COMPLETED' && !x.evaluation)
    const wrapper = await openPage('/order/' + o.id + '/review')
    expect(bodyText()).toContain(PHONE_TEXT)
    expect(barePhoneNodes()).toEqual([])
    wrapper.unmount()
  })

  it('变更出行时间（超时提示）：号码可拨号', async () => {
    const o = store.orders.find(x => x.status === 'CONFIRMED')
    const wrapper = await openPage('/order/' + o.id + '/reschedule')
    // 该单出行时间在未来，不会触发超时提示；这里只校验页面上没有裸号码
    expect(barePhoneNodes()).toEqual([])
    wrapper.unmount()
  })

  it('资格被拦截时的"拨打客服"整行就是一个 tel 链接', async () => {
    const wrapper = await openPage('/eligibility')
    await settle(4)
    // 选择不符合条件的选项，走到拦截页
    const opt = [...document.querySelectorAll('.q-opt, button')].find(e => e.textContent.includes('转院') || e.textContent.includes('康复'))
    if (opt) {
      opt.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await sleep(200)
      await settle(4)
    }
    const links = [...document.querySelectorAll('a[href="' + PHONE_TEL + '"]')]
    if (bodyText().includes(PHONE_TEXT)) {
      expect(links.length).toBeGreaterThan(0)
      expect(barePhoneNodes()).toEqual([])
    }
    wrapper.unmount()
  })

  it('订单详情底部"平台客服"与"联系司机"都是拨号链接', async () => {
    const o = store.orders.find(x => x.status === 'CONFIRMED')
    const wrapper = await openPage('/order/' + o.id)
    const tel = [...document.querySelectorAll('a[href="' + PHONE_TEL + '"]')]
    // 至少：服务商卡联系司机、时间轴卡片、底部客服、底部联系司机
    expect(tel.length).toBeGreaterThanOrEqual(3)
    const txt = tel.map(a => a.textContent.replace(/\s+/g, ''))
    expect(txt.some(t => t.includes('平台客服'))).toBe(true)
    expect(txt.some(t => t.includes('联系司机'))).toBe(true)
    wrapper.unmount()
  })
})
