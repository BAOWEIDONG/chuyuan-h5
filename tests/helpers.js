import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../src/App.vue'

// 真实路由表（含懒加载页面），与线上完全一致
export async function makeApp(startPath = '/demo/entry', member) {
  const routes = (await import('../src/router.js')).default.options.routes
  const router = createRouter({ history: createWebHashHistory(), routes: routes.filter(r => r.path !== '/:pathMatch(.*)*') })
  if (member) {
    sessionStorage.setItem('cy_session', JSON.stringify(member))
  } else {
    sessionStorage.removeItem('cy_session')
  }
  router.push(startPath)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  await settle()
  return { wrapper, router }
}

export async function settle(times = 6) {
  for (let i = 0; i < times; i++) {
    await flushPromises()
    await nextTick()
  }
}

export function txt(el) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim()
}

export function byText(wrapper, selector, text) {
  return wrapper.findAll(selector).find(w => txt(w.element).includes(text))
}

export function q(sel) {
  return Array.from(document.querySelectorAll(sel))
}

export function bodyText() {
  return document.body.textContent.replace(/\s+/g, ' ')
}

export function click(el) {
  if (!el) throw new Error('click target not found')
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

export const MEMBER = {
  memberId: 'M0001', memberName: '陈晓梅', idNo: '340104198705124628', mobile: '13855666612',
  policyNo: 'P2026****8831', channel: '平安乐健康 App', policyStatus: '有效',
  waitPeriodPassed: true, remaining: 1, exp: Date.now() + 7200000
}
