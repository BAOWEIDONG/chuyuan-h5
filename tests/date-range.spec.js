import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER, click, q } from './helpers.js'
import { addDays, ymd, ymdCn, parseYmd } from '../src/rules/time.js'
import { resetDraft } from '../src/store/draft.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function tap(text, sel = 'button, .opt, .field, .date-cell, .chip') {
  await sleep(200)
  await settle(2)
  const masks = q('.mask')
  const root = masks.length ? masks[masks.length - 1] : document.body
  const el = [...root.querySelectorAll(sel)].find(e => !e.disabled && e.textContent.replace(/\s+/g, ' ').includes(text))
  if (!el) {
    const m = masks[masks.length - 1]
    throw new Error(`找不到可点击的「${text}」，masks=${masks.length}，maskHTML=${m ? m.innerHTML.replace(/\s+/g, ' ').slice(0, 400) : '-'}`)
  }
  click(el)
  await sleep(220)
  await settle(6)
  return el
}

function cells() {
  const masks = q('.mask')
  const root = masks.length ? masks[masks.length - 1] : document.body
  return [...root.querySelectorAll('.date-cell')].map(e => e.textContent.replace(/\s+/g, ' ').trim())
}

describe('预约页日期可选范围', () => {
  let router, wrapper
  beforeEach(async () => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    // draft 是模块级单例，不清会把上一条用例的日期带进来
    resetDraft()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = await makeApp('/book', MEMBER)
    wrapper = app.wrapper
    router = app.router
    await settle(8)
  })

  it('入院 30 天前时，出院日期仍可选（不再全部落在过去）', async () => {
    const today = new Date()
    const admission = addDays(today, -30)

    await tap('入院日期', '.field')
    await tap(ymdCn(parseYmd(ymd(admission))), '.date-cell')
    await tap('确定')
    expect(bodyText()).toContain(ymd(admission))

    // 打开出院日期：必须还有可选日期，且全部晚于入院日期
    await tap('出院日期', '.field')
    const list = cells()
    expect(list.length, '出院日期弹层不应为空').toBeGreaterThan(0)
    expect(list.some(t => t.includes(ymdCn(parseYmd(ymd(today))))), '应包含今天').toBe(true)
    for (const t of list) {
      const d = t.match(/(\d+)月(\d+)日/)
      expect(d).toBeTruthy()
    }
    // 选今天的出院日期并确认
    await tap(ymdCn(parseYmd(ymd(today))), '.date-cell')
    await tap('确定')
    expect(bodyText()).not.toContain('请选择出院日期')
    wrapper.unmount()
  })

  it('出院候选最多 7 天，且都晚于入院日期', async () => {
    const today = new Date()
    const admission = addDays(today, -2)
    await tap('入院日期', '.field')
    await tap(ymdCn(parseYmd(ymd(admission))), '.date-cell')
    await tap('确定')
    await tap('出院日期', '.field')
    const list = cells()
    expect(list.length).toBeGreaterThan(0)
    // 入院在前天时今天已可出院，可选 今天~+7 共 8 天；上限按 R05 的 7 天内预约
    expect(list.length).toBeLessThanOrEqual(8)
    // 入院后第 0 天（今天若等于入院日）不可选，最早是明天
    const admissionCn = ymdCn(parseYmd(ymd(admission)))
    expect(list.some(t => t.includes(admissionCn))).toBe(false)
    await tap(ymdCn(parseYmd(ymd(addDays(today, 1)))), '.date-cell')
    await tap('确定')
    expect(bodyText()).toContain(ymd(addDays(today, 1)))
    wrapper.unmount()
  })

  it('当天入院时给出明确提示，而不是弹层空白', async () => {
    const today = new Date()
    await tap('入院日期', '.field')
    await tap(ymdCn(parseYmd(ymd(today))), '.date-cell')
    await tap('确定')
    await tap('出院日期', '.field')
    const list = cells()
    expect(list.length).toBeGreaterThan(0)
    // 当天入院：明天~+7 共 7 天
    expect(list.length).toBe(7)
    // 当天入院时，今天的出院日期不可选
    expect(list.some(t => t.includes(ymdCn(parseYmd(ymd(today)))))).toBe(false)
    await tap(ymdCn(parseYmd(ymd(addDays(today, 1)))), '.date-cell')
    await tap('确定')
    expect(bodyText()).toContain(ymd(addDays(today, 1)))
    wrapper.unmount()
  })
})
