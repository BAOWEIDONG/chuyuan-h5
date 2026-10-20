import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeApp, settle, bodyText, MEMBER, click } from './helpers.js'
import { q } from './helpers.js'
import { ymd, addDays, ymdCn, parseYmd } from '../src/rules/time.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))


async function waitRoute(router, name, ms = 3000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (router.currentRoute.value.name === name) return
    await sleep(50)
    await settle(2)
  }
  throw new Error(`路由未到达 ${name}，当前 ${router.currentRoute.value.fullPath}；页面：${bodyText().slice(0, 200)}`)
}

function visible(el) {
  if (!el || el.disabled) return false
  const s = getComputedStyle(el)
  if (s.display === 'none' || s.visibility === 'hidden') return false
  const r = el.getBoundingClientRect()
  // jsdom 无布局，尺寸为 0；改用 style 与 hidden 属性判断
  return !el.hidden
}

/** 在 body 里按文本点一个按钮/元素 */
const DEFAULT_SEL = 'button, .opt, .field, .sc, .date-cell, .slot, .chip'

// 只在实际可见的最上层弹层里找元素，模拟用户的真实视野
function scopeRoot() {
  const masks = q('.mask')
  return masks.length ? masks[masks.length - 1] : document.body
}

async function tap(text, sel = DEFAULT_SEL) {
  await sleep(260)
  await settle(2)
  const root = scopeRoot()
  const el = [...root.querySelectorAll(sel)].filter(visible).find(e => e.textContent.replace(/\s+/g, ' ').includes(text))
  if (!el) throw new Error(`找不到可点击的「${text}」，当前页面：${bodyText().slice(0, 300)}`)
  click(el)
  await sleep(260)
  await settle(6)
  return el
}

async function tapExact(text, sel = 'button') {
  await settle(2)
  const el = q(sel).filter(visible).find(e => e.textContent.replace(/\s+/g, ' ').trim() === text)
  if (!el) throw new Error(`找不到「${text}」`)
  click(el)
  await sleep(260)
  await settle(6)
}

describe('主链路：免登 → 资格 → 预约 → 方案 → 材料 → 提交 → 进度', () => {
  let wrapper, router, errors
  beforeEach(() => {
    document.body.innerHTML = ''
    localStorage.clear()
    sessionStorage.clear()
    errors = []
    vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('完整走通一次短途预约，并生成可查看的订单', async () => {
    const app = await makeApp('/demo/entry')
    wrapper = app.wrapper
    router = app.router

    // 1. 客户 App 入口 → 去预约（生成签名 token 并跳转 auth）
    await tap('去预约')
    await sleep(30)
    await settle(10)
    await waitRoute(router, 'auth')
    await sleep(600)
    await settle(10)
    await waitRoute(router, 'home')
    expect(bodyText()).toContain('出院交通安排')

    // 2. 首页 → 预约 → 资格三问
    await tap('预约出院交通')
    await waitRoute(router, 'eligibility')
    await tap('出院后回家庭常住地')
    await tap('病情稳定')
    await tap('还没有出院')
    await waitRoute(router, 'book')

    // 3. 医院：省份 → 城市 → 医院
    await tap('搜索选择医院', '.field')
    await tap('请选择省 / 直辖市', '.field')
    await tap('安徽')
    await tap('合肥')
    const hosp = q('.opt').find(e => e.textContent.includes('安徽医科大学第一附属医院'))
    expect(hosp, '医院列表应包含安医附院').toBeTruthy()
    click(hosp)
    await settle(4)
    expect(bodyText()).toContain('安徽医科大学第一附属医院')

    // 4. 入院 / 出院日期
    const today = new Date()
    const admission = addDays(today, -5)
    const discharge = addDays(today, 1)
    await tap('选择日期')
    await tap(ymdCn(parseYmd(ymd(admission))), '.date-cell')
    await tap('确定')
    await tap('选择日期')
    await tap(ymdCn(parseYmd(ymd(discharge))), '.date-cell')
    await tap('确定')

    // 5. 家庭常住地：省 → 市 → 区 → 小区 → 证明
    await tap('选择或登记地址', '.field')
    await tap('搜索或选择城市', '.field')
    await tap('合肥')
    await tap('蜀山区')
    await tap('请选择小区')
    await tap('万科城')
    await tap('请选择可提供的材料')
    await tap('房产证')
    await tap('确认登记')
    expect(bodyText()).toContain('万科城')

    // 6. 出行日期（出院后 1 天）与时间
    await tap('出行日期', '.field')
    await tap(ymdCn(parseYmd(ymd(discharge))), '.date-cell')
    await tap('确定')
    await tap('选择时间', '.field')
    await tap('10:00')
    await tap('确定')

    // 7. 联系人默认本人（手机号来自登录参数）
    expect(bodyText()).toContain('本人')

    // 8. 下一步 → 方案
    await tap('下一步')
    await waitRoute(router, 'plan')
    expect(bodyText()).toMatch(/\d+ ?公里/)

    // 9. 方案 → 材料
    await tap('下一步：上传材料')
    await waitRoute(router, 'materials')

    // 10. 一键示例材料
    await tap('出院小结（示例）')
    await tap('房产证（示例）')
    await tap('下一步：核对信息')
    await waitRoute(router, 'confirm')

    // 11. 同意规则 → 提交
    const agree = q('.agree')[0]
    expect(agree, '应出现同意条款勾选区').toBeTruthy()
    click(agree)
    await tap('提交申请')
    await sleep(900)
    await settle(10)
    await waitRoute(router, 'success')
    expect(bodyText()).toContain('申请已提交')

    // 12. 首页出现进行中订单
    await router.push('/')
    await settle(8)
    expect(bodyText()).toContain('审核中')
    expect(bodyText()).toContain('安徽医科大学第一附属医院')

    // 13. 没有前端运行时错误
    expect(errors.filter(e => /Vue warn|Uncaught|TypeError|ReferenceError/.test(e))).toEqual([])
  }, 40000)
})
