// 联合登录：演示用 HMAC-SHA256 对参数签名，真实项目由甲方与我方网关对接
// 参数经 URL 传递：token（payload.signature）+ 可选 next
const DEMO_KEY = 'chuyuan-demo-2026'

function b64urlEncode(bytes) {
  let s = ''
  bytes.forEach(b => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

async function hmac(payload, key = DEMO_KEY) {
  const enc = new TextEncoder()
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(payload))
  return b64urlEncode(new Uint8Array(sig))
}

export async function createToken(payload) {
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await hmac(body)
  return `${body}.${sig}`
}

export async function verifyToken(token) {
  if (!token || !token.includes('.')) return { ok: false, reason: '缺少登录凭证，请从保司 App 重新进入' }
  const [body, sig] = token.split('.')
  let payload
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)))
  } catch {
    return { ok: false, reason: '登录参数格式不正确' }
  }
  const expect = await hmac(body)
  if (expect !== sig) return { ok: false, reason: '登录凭证校验失败，参数可能被篡改' }
  if (payload.exp && Date.now() > payload.exp) return { ok: false, reason: '登录已过期，请重新进入' }
  return { ok: true, payload }
}
