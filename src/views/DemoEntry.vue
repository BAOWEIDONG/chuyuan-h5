<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import { createToken } from '../rules/session.js'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const err = ref('')

// 演示用户：改动这里可以演示不同保单状态
const personas = [
  {
    key: 'normal', name: '陈晓梅', policy: 'P2026****8831', channel: '平安乐健康 App',
    memberName: '陈晓梅', idNo: '340104198705124628', mobile: '13855666612',
    waitPeriodPassed: true, remaining: 1, policyStatus: '有效'
  },
  {
    key: 'waiting', name: '李建国', policy: 'P2026****2104', channel: '平安乐健康 App',
    memberName: '李建国', idNo: '110105196803223314', mobile: '13911883087',
    waitPeriodPassed: false, remaining: 0, policyStatus: '等待期内'
  }
]
const persona = ref(personas[0])

const next = computed(() => route.query.next || '/')

async function enter() {
  loading.value = true
  err.value = ''
  try {
    const p = persona.value
    const payload = {
      memberId: 'M0001',
      memberName: p.memberName,
      idNo: p.idNo,
      mobile: p.mobile,
      policyNo: p.policy,
      channel: p.channel,
      policyStatus: p.policyStatus,
      waitPeriodPassed: p.waitPeriodPassed,
      remaining: p.remaining,
      exp: Date.now() + 2 * 3600 * 1000,
      iat: Date.now()
    }
    const token = await createToken(payload)
    router.replace({ name: 'auth', query: { token, next: next.value } })
  } catch (e) {
    err.value = '生成跳转参数失败：' + e.message
  } finally {
    loading.value = false
  }
}

function openConsole() {
  router.push('/demo')
}
</script>

<template>
  <div class="entry">
    <div class="entry-head">
      <div class="brand">
        <span class="dot" />
        <span>平安乐健康</span>
      </div>
      <span class="small" style="color:rgba(255,255,255,.7)">演示环境</span>
    </div>

    <div class="phone">
      <div class="phone-inner">
        <div class="mock-nav">
          <span class="back-arrow">‹</span>
          <span>我的 · 用服务</span>
        </div>

        <div class="mock-greet">
          <div class="g1">你好，{{ persona.name }}</div>
          <div class="g2">保单 {{ persona.policy }}</div>
        </div>

        <div class="mock-card">
          <div class="mc-top">
            <div class="mc-icon"><Icon name="car" :size="22" /></div>
            <div>
              <div class="mc-title">出院交通安排</div>
              <div class="mc-sub">出院后返回家庭常住地</div>
            </div>
            <span class="mc-num">{{ persona.remaining }} 次</span>
          </div>
          <button class="mc-btn" :disabled="loading" @click="enter">
            {{ loading ? '正在跳转…' : '去预约' }}
            <Icon name="arrowRight" :size="16" />
          </button>
        </div>

        <div class="mock-list">
          <div class="ml-item"><span>住院探视</span><span class="muted">查看</span></div>
          <div class="ml-item"><span>就医绿通</span><span class="muted">查看</span></div>
          <div class="ml-item"><span>体检服务</span><span class="muted">查看</span></div>
        </div>

        <p class="mock-note">以上为客户方 App 界面示意，点击"去预约"后携带登录凭证跳转至服务方页面</p>
      </div>
    </div>

    <div class="entry-foot">
      <div class="persona-row">
        <button v-for="p in personas" :key="p.key" class="persona" :class="{ on: persona.key === p.key }" @click="persona = p">
          <span class="pn">{{ p.name }}</span>
          <span class="pd">{{ p.policyStatus }} · 剩余 {{ p.remaining }} 次</span>
        </button>
      </div>
      <p v-if="err" class="tiny" style="color:#F3B4A8">{{ err }}</p>
      <button class="console-link" @click="openConsole">进入演示控制台</button>
    </div>
  </div>
</template>

<style scoped>
.entry {
  min-height: 100vh; display: flex; flex-direction: column;
  background: #16302B;
  background-image: radial-gradient(120% 60% at 50% 0%, #245247 0%, #16302B 58%);
  padding: 0 22px calc(20px + env(safe-area-inset-bottom));
}
.entry-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 0 4px; color: #fff; }
.brand { display: flex; align-items: center; gap: 8px; font-size: 14px; letter-spacing: .06em; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #E0A94A; }
.phone { flex: 1; display: flex; align-items: center; padding: 14px 0; }
.phone-inner {
  width: 100%; background: #F5F3EE; border-radius: 18px; padding: 14px 14px 10px;
  box-shadow: 0 24px 60px -30px rgba(0,0,0,.7);
}
.mock-nav { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #53625E; padding: 2px 2px 12px; border-bottom: 1px solid #E4DFD5; }
.back-arrow { font-size: 20px; line-height: 1; }
.mock-greet { padding: 14px 2px 12px; }
.g1 { font-family: var(--serif); font-size: 20px; font-weight: 700; color: #1B2A33; }
.g2 { font-size: 12px; color: #7C8A91; margin-top: 3px; }
.mock-card { background: #fff; border-radius: 14px; padding: 14px; border: 1px solid #E7E2D8; }
.mc-top { display: flex; align-items: center; gap: 10px; }
.mc-icon { width: 38px; height: 38px; border-radius: 10px; background: #E6EFEC; color: #146356; display: grid; place-items: center; flex: none; }
.mc-title { font-size: 15px; font-weight: 600; color: #1B2A33; }
.mc-sub { font-size: 12px; color: #7C8A91; margin-top: 1px; }
.mc-num { margin-left: auto; font-size: 12px; color: #146356; background: #E6EFEC; padding: 3px 8px; border-radius: 6px; font-weight: 600; }
.mc-btn {
  margin-top: 12px; width: 100%; height: 42px; border-radius: 10px;
  background: #146356; color: #fff; font-size: 14.5px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.mc-btn:disabled { opacity: .7; }
.mock-list { margin-top: 12px; background: #fff; border-radius: 14px; border: 1px solid #E7E2D8; padding: 0 14px; }
.ml-item { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid #F0ECE4; font-size: 14px; color: #34443F; }
.ml-item:last-child { border-bottom: 0; }
.mock-note { font-size: 11px; color: #98A3A0; line-height: 1.5; margin: 12px 2px 2px; }
.entry-foot { padding-top: 8px; }
.persona-row { display: flex; gap: 8px; }
.persona { flex: 1; text-align: left; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); color: rgba(255,255,255,.72); }
.persona.on { border-color: rgba(224,169,74,.8); background: rgba(224,169,74,.12); color: #fff; }
.pn { display: block; font-size: 13.5px; font-weight: 600; }
.pd { display: block; font-size: 11px; margin-top: 2px; opacity: .8; }
.console-link { margin-top: 12px; width: 100%; text-align: center; font-size: 12.5px; color: rgba(255,255,255,.6); padding: 8px; }
</style>
