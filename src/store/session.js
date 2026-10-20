import { reactive } from 'vue'

const KEY = 'cy_session'

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

export const session = reactive({
  member: load(),
  set(payload) {
    this.member = payload
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  },
  clear() {
    this.member = null
    sessionStorage.removeItem(KEY)
  }
})

export function memberInitial() {
  const n = session.member?.memberName || '客户'
  return n.slice(0, 1)
}

export function maskId(id) {
  if (!id) return ''
  return id.length >= 8 ? id.slice(0, 4) + '**********' + id.slice(-4) : id
}

export function maskPhone(p) {
  if (!p) return ''
  return p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}
