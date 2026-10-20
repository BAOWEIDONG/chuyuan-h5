import { reactive, computed } from 'vue'

const KEY = 'cy_orders'
const MSG_KEY = 'cy_messages'
const ADDR_KEY = 'cy_address'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// 全局订单池：演示时用同一个浏览器即可看到全部数据
export const store = reactive({
  orders: read(KEY, []),
  messages: read(MSG_KEY, []),
  address: read(ADDR_KEY, null),
  persist() {
    write(KEY, this.orders)
    write(MSG_KEY, this.messages)
    write(ADDR_KEY, this.address)
  },
  addOrder(order) {
    this.orders.unshift(order)
    this.persist()
  },
  updateOrder(id, patch) {
    const i = this.orders.findIndex(o => o.id === id)
    if (i < 0) return null
    const next = { ...this.orders[i], ...patch, updatedAt: new Date().toISOString() }
    this.orders[i] = next
    this.persist()
    return next
  },
  getOrder(id) {
    return this.orders.find(o => o.id === id) || null
  },
  setAddress(addr) {
    this.address = addr
    this.persist()
  },
  pushMessage(msg) {
    this.messages.unshift({ id: 'M' + Date.now(), read: false, at: new Date().toISOString(), ...msg })
    this.persist()
  },
  markRead(id) {
    const m = this.messages.find(x => x.id === id)
    if (m) { m.read = true; this.persist() }
  },
  markAllRead() {
    this.messages.forEach(m => (m.read = true))
    this.persist()
  },
  reset() {
    this.orders = []
    this.messages = []
    this.address = null
    this.persist()
  }
})

export const activeOrder = computed(() =>
  store.orders.find(o => !['COMPLETED', 'CLOSED'].includes(o.status))
)

export const unreadCount = computed(() => store.messages.filter(m => !m.read).length)
