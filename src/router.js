import { createRouter, createWebHashHistory } from 'vue-router'

// 用 hash 路由：GitHub Pages 刷新不会 404
const routes = [
  { path: '/', name: 'home', component: () => import('./views/Home.vue') },
  { path: '/auth', name: 'auth', component: () => import('./views/Auth.vue') },
  { path: '/demo/entry', name: 'demoEntry', component: () => import('./views/DemoEntry.vue') },
  { path: '/eligibility', name: 'eligibility', component: () => import('./views/Eligibility.vue') },
  { path: '/blocked', name: 'blocked', component: () => import('./views/Blocked.vue') },
  { path: '/book', name: 'book', component: () => import('./views/Book.vue') },
  { path: '/book/plan', name: 'plan', component: () => import('./views/Plan.vue') },
  { path: '/book/materials', name: 'materials', component: () => import('./views/Materials.vue') },
  { path: '/book/confirm', name: 'confirm', component: () => import('./views/Confirm.vue') },
  { path: '/book/success/:id', name: 'success', component: () => import('./views/Success.vue') },
  { path: '/order/:id', name: 'order', component: () => import('./views/Order.vue') },
  { path: '/order/:id/reschedule', name: 'reschedule', component: () => import('./views/Reschedule.vue') },
  { path: '/order/:id/review', name: 'review', component: () => import('./views/Review.vue') },
  { path: '/orders', name: 'orders', component: () => import('./views/Orders.vue') },
  { path: '/address', name: 'address', component: () => import('./views/Address.vue') },
  { path: '/rules', name: 'rules', component: () => import('./views/Rules.vue') },
  { path: '/messages', name: 'messages', component: () => import('./views/Messages.vue') },
  { path: '/demo', name: 'demo', component: () => import('./views/DemoConsole.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({ history: createWebHashHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.beforeEach((to) => {
  // 未登录时，除登录中转与模拟入口外都回到入口
  const raw = sessionStorage.getItem('cy_session')
  if (!raw && !['auth', 'demoEntry'].includes(to.name)) {
    return { name: 'demoEntry', query: { next: to.fullPath } }
  }
})

export default router
