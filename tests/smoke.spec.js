import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER } from './helpers.js'

const ROUTES = [
  ['/', '出院交通安排'],
  ['/eligibility', '服务资格确认'],
  ['/book', '预约出院交通'],
  ['/book/plan', '方案确认'],
  ['/book/materials', '材料上传'],
  ['/book/confirm', '核对并提交'],
  ['/orders', '服务记录'],
  ['/address', '家庭常住地'],
  ['/rules', '服务规则'],
  ['/messages', '消息'],
  ['/demo', '演示控制台'],
  ['/order/X', '订单详情']
]

describe('所有页面可渲染且无控制台报错', () => {
  let errors
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    errors = []
    vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  for (const [path, expectText] of ROUTES) {
    it(`${path} 渲染包含「${expectText}」`, async () => {
      const { wrapper } = await makeApp('/demo/entry', MEMBER)
      await wrapper.vm.$router.push(path)
      await settle(8)
      const t = bodyText()
      expect(t.length).toBeGreaterThan(20)
      expect(t).toContain(expectText)
      wrapper.unmount()
    })
  }
})
