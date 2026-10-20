<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { verifyToken } from '../rules/session.js'
import { session } from '../store/session.js'

const route = useRoute()
const router = useRouter()
const state = ref('checking')
const reason = ref('')

onMounted(async () => {
  const token = String(route.query.token || '')
  const res = await verifyToken(token)
  if (!res.ok) {
    state.value = 'error'
    reason.value = res.reason
    return
  }
  session.set(res.payload)
  state.value = 'ok'
  setTimeout(() => {
    const next = String(route.query.next || '/')
    router.replace(next.startsWith('/') ? next : '/')
  }, 420)
})

function retry() {
  router.replace('/demo/entry')
}
</script>

<template>
  <div class="auth">
    <div class="auth-box">
      <template v-if="state === 'checking' || state === 'ok'">
        <div class="spin" />
        <div class="h3" style="margin-top:16px">正在校验保单权益</div>
        <p class="small muted" style="margin-top:6px">请稍候，不要关闭页面</p>
      </template>
      <template v-else>
        <div class="err-icon"><Icon name="alert" :size="26" /></div>
        <div class="h3" style="margin-top:14px">无法进入服务</div>
        <p class="small muted" style="margin-top:6px;max-width:260px;text-align:center">{{ reason }}</p>
        <button class="btn btn-ghost btn-sm" style="margin-top:20px" @click="retry">返回重新进入</button>
      </template>
    </div>
    <p class="foot tiny">本服务由服务方提供，页面仅用于演示</p>
  </div>
</template>

<style scoped>
.auth { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--paper); }
.auth-box { display: flex; flex-direction: column; align-items: center; }
.spin { width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid var(--brand-tint); border-top-color: var(--brand); animation: sp .8s linear infinite; }
@keyframes sp { to { transform: rotate(360deg) } }
.err-icon { width: 52px; height: 52px; border-radius: 50%; background: var(--seal-tint); color: var(--seal); display: grid; place-items: center; }
.foot { position: absolute; bottom: 28px; color: var(--ink-3); }
</style>
