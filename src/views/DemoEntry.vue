<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Icon from '../components/Icon.vue'
import { createToken } from '../rules/session.js'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const err = ref('')

// 客户 App 以被保险人本人登录，只展示本人。等待期状态仅用于演示，
// 通过平台操作台的入口进入（/demo/entry?persona=waiting）。
const personas = [
  {
    key: 'normal', name: '陈晓梅', policy: 'P2026****8831', channel: '客户 App',
    memberName: '陈晓梅', idNo: '340104198705124628', mobile: '13855666612',
    waitPeriodPassed: true, remaining: 1, policyStatus: '有效'
  },
  {
    key: 'waiting', name: '李建国', policy: 'P2026****2104', channel: '客户 App',
    memberName: '李建国', idNo: '110105196803223314', mobile: '13911883087',
    waitPeriodPassed: false, remaining: 0, policyStatus: '等待期内'
  }
]
const persona = ref(personas[0])
onMounted(() => {
  if (route.query.persona === 'waiting') persona.value = personas[1]
})

const next = computed(() => route.query.next || '/')
const steps = ['提交信息', '审核派单', '联系确认', '接送到家']

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
    <!-- 客户 App 顶部栏 -->
    <header class="app-bar">
      <span class="ab-back"><Icon name="back" :size="18" /></span>
      <span class="ab-title">我的服务</span>
      <span class="ab-more" />
    </header>

    <div class="entry-body">
      <div class="me">
        <div class="me-avatar">{{ persona.name.slice(0, 1) }}</div>
        <div class="me-txt">
          <div class="me-n">你好，{{ persona.name }}</div>
          <div class="me-p num">保单 {{ persona.policy }}</div>
        </div>
        <span class="me-tag">被保险人本人</span>
      </div>

      <div class="sec-h">
        <span class="sec-t">可用服务</span>
        <span class="sec-c num">共 1 项</span>
      </div>

      <div class="svc">
        <div class="svc-top">
          <span class="svc-ic"><Icon name="car" :size="24" /></span>
          <div class="svc-tt">
            <div class="svc-t">出院交通安排</div>
            <div class="svc-s">出院后从医院直达家庭常住地</div>
          </div>
        </div>
        <ul class="svc-pts">
          <li><Icon name="check" :size="13" /> 全国 331 城市，二级及以上公立医院</li>
          <li><Icon name="check" :size="13" /> 本次住院可用 <b class="num">{{ persona.remaining }}</b> 次</li>
          <li><Icon name="check" :size="13" /> 专业司机与合规车辆，行程可实时查看</li>
        </ul>
        <div class="svc-meta">
          <span>服务时间 工作日 9:00–21:00</span>
          <span class="svc-st" :class="{ off: persona.policyStatus !== '有效' }">保单{{ persona.policyStatus }}</span>
        </div>
      </div>

      <div class="sec-h" style="padding-top:22px">
        <span class="sec-t">服务流程</span>
        <span class="sec-c">全程可查进度</span>
      </div>
      <ol class="flow">
        <li v-for="(f, i) in steps" :key="f">
          <span class="fl-n num">{{ i + 1 }}</span>
          <span class="fl-t">{{ f }}</span>
          <span v-if="i < steps.length - 1" class="fl-line" />
        </li>
      </ol>

      <div class="card flat notice">
        <div class="nt-t"><Icon name="info" :size="15" /> 使用说明</div>
        <ul>
          <li>仅限被保险人本人使用，同一次住院限 1 次。</li>
          <li>需在出院前预约，服务范围为家庭常住地所在城市。</li>
          <li>本服务为普通交通接送，不含医疗陪护与急救转运。</li>
        </ul>
      </div>

      <p class="tip">点击「去预约」后，将携带本次登录凭证进入服务页面。</p>
      <p v-if="err" class="tip err-t">{{ err }}</p>
    </div>

    <div class="entry-foot">
      <button class="btn btn-primary" :disabled="loading" @click="enter">
        {{ loading ? '正在进入…' : '去预约' }}
        <Icon v-if="!loading" name="arrowRight" :size="17" />
      </button>
      <button class="console-link" @click="openConsole">进入平台操作台</button>
    </div>
  </div>
</template>

<style scoped>
.entry {
  min-height: 100vh; display: flex; flex-direction: column;
  background:
    radial-gradient(96% 30% at 100% -4%, rgba(255, 138, 66, .16), transparent 66%),
    linear-gradient(180deg, #FFF8F2 0%, #F5F6FA 34%, #F5F6FA 100%);
  padding: 0 16px calc(14px + env(safe-area-inset-bottom));
}

/* 顶部栏 */
.app-bar {
  display: grid; grid-template-columns: 34px 1fr 34px; align-items: center;
  height: 54px; margin: 0 -16px; padding: 0 16px;
}
.ab-back { display: grid; place-items: center; color: var(--ink); }
.ab-title { text-align: center; font-size: 16px; font-weight: 700; }
.ab-more { justify-self: end; width: 5px; height: 5px; border-radius: 50%; background: var(--ink-3); box-shadow: 0 0 0 3px transparent, 8px 0 0 var(--ink-3), -8px 0 0 var(--ink-3); }

.entry-body { flex: 1; padding-top: 6px; }

/* 本人 */
.me { display: flex; align-items: center; gap: 12px; padding: 12px 2px 18px; }
.me-avatar {
  width: 48px; height: 48px; border-radius: 50%; flex: none;
  background: var(--grad-sky); color: #fff;
  display: grid; place-items: center; font-size: 18px; font-weight: 700;
  box-shadow: 0 6px 14px rgba(62, 142, 247, .22);
}
.me-txt { flex: 1; min-width: 0; }
.me-n { font-size: 22px; font-weight: 800; letter-spacing: .4px; }
.me-p { font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }
.me-tag {
  flex: none; font-size: 11px; font-weight: 600; color: var(--brand-ink);
  background: var(--brand-tint); border: 1px solid var(--brand-line);
  padding: 4px 9px; border-radius: 9px;
}

.sec-h { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 10px; }
.sec-t { font-size: 14px; font-weight: 700; color: var(--ink-2); }
.sec-c { font-size: 11.5px; color: var(--ink-3); }

/* 服务卡：整宽度，信息一次铺开 */
.svc {
  background: var(--card); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid rgba(255, 255, 255, .96); border-radius: 24px;
  box-shadow: var(--shadow); padding: 18px 18px 0; overflow: hidden;
}
.svc-top { display: flex; align-items: center; gap: 13px; }
.svc-ic {
  width: 52px; height: 52px; border-radius: 17px; flex: none;
  background: var(--grad); color: #fff; display: grid; place-items: center;
  box-shadow: 0 10px 20px rgba(255, 90, 0, .28), inset 0 1px 1px rgba(255, 255, 255, .45);
}
.svc-tt { min-width: 0; }
.svc-t { font-size: 19px; font-weight: 800; letter-spacing: .2px; }
.svc-s { font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }

.svc-pts { list-style: none; margin: 18px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.svc-pts li { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-2); line-height: 1.45; }
.svc-pts svg { flex: none; color: var(--green); }
.svc-pts b { color: var(--brand); font-weight: 800; }

.svc-meta {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin: 18px -18px 0; padding: 12px 18px;
  border-top: 1px solid rgba(60, 60, 67, .06); background: rgba(255, 255, 255, .55);
  font-size: 11.5px; color: var(--ink-3);
}
.svc-st { color: var(--green); font-weight: 600; }
.svc-st.off { color: var(--amber); }

.flow { list-style: none; margin: 0; padding: 2px 2px 0; display: grid; grid-template-columns: repeat(4, 1fr); }
.flow li { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; text-align: center; }
.fl-n {
  width: 26px; height: 26px; border-radius: 50%; z-index: 1;
  background: #fff; border: 1.5px solid var(--brand-line); color: var(--brand-ink);
  display: grid; place-items: center; font-size: 12px; font-weight: 800;
}
.fl-t { font-size: 11.5px; color: var(--ink-2); line-height: 1.4; padding: 0 4px; }
.fl-line { position: absolute; top: 13px; left: calc(50% + 16px); right: calc(-50% + 16px); height: 1.5px; background: linear-gradient(90deg, var(--brand-line), rgba(60,60,67,.12)); }

.notice { margin-top: 18px; padding: 14px 16px; border-radius: 18px; }
.nt-t { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--ink-2); }
.nt-t svg { color: var(--brand); }
.notice ul { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.notice li { position: relative; padding-left: 11px; font-size: 12.5px; color: var(--ink-3); line-height: 1.55; }
.notice li::before { content: ''; position: absolute; left: 0; top: 8px; width: 3px; height: 3px; border-radius: 50%; background: rgba(60,60,67,.3); }

.tip { font-size: 11.5px; color: var(--ink-3); line-height: 1.6; margin: 14px 4px 0; }
.err-t { color: var(--red); }

/* 底部操作区 */
.entry-foot { padding-top: 18px; }
.console-link { margin-top: 6px; width: 100%; text-align: center; font-size: 12px; color: var(--ink-3); padding: 10px; }
</style>
