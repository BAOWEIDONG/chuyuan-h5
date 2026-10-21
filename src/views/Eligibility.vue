<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import CallLink from '../components/CallLink.vue'
import NavBar from '../components/NavBar.vue'
import ProgressDots from '../components/ProgressDots.vue'
import { ELIGIBILITY_QUESTIONS } from '../rules/eligibility.js'
import { session } from '../store/session.js'
import { store, activeOrder } from '../store/orders.js'
import { draft } from '../store/draft.js'

const router = useRouter()
const questions = ELIGIBILITY_QUESTIONS
const step = ref(0)
const answers = ref({})
const blocked = ref(null)
const bypass = ref(false)

// 已用尽本次住院权益，直接拦在入口
const usedUp = computed(() => {
  if (bypass.value) return false
  return !!activeOrder.value
})

const current = computed(() => questions[step.value])
const progressLabels = computed(() => ['用车场景', '病情状态', '出院时间'])

function choose(opt) {
  answers.value[current.value.key] = opt
  if (!opt.ok) {
    blocked.value = opt
    return
  }
  if (step.value < questions.length - 1) {
    step.value++
  } else {
    finish()
  }
}

function finish() {
  draft.eligibility = Object.fromEntries(Object.entries(answers.value).map(([k, v]) => [k, v.value]))
  router.push('/book')
}

function back() {
  if (blocked.value) { blocked.value = null; return }
  if (step.value > 0) step.value--
  else router.back()
}
</script>

<template>
  <div>
    <NavBar title="服务资格确认" @click-back="back" />
    <div class="page">
      <ProgressDots :total="3" :current="step + 1" :labels="progressLabels" />

      <!-- 权益已用 -->
      <template v-if="usedUp">
        <div class="card" style="margin-top:22px">
          <div class="h2">本次住院已申请过服务</div>
          <p class="small muted" style="margin-top:8px">保单有效期内，同一次住院仅提供 1 次出院交通安排服务。你可以在服务记录中查看当前订单进度。</p>
          <button class="btn btn-primary" style="margin-top:16px" @click="router.push('/order/' + activeOrder.id)">查看当前进度</button>
          <button class="reapply" @click="bypass = true">以另一次住院重新申请</button>
        </div>
      </template>

      <!-- 拦截 -->
      <template v-else-if="blocked">
        <div class="block" style="margin-top:24px">
          <div class="block-icon"><Icon name="alert" :size="26" /></div>
          <div class="h2" style="margin-top:12px">这项服务本次不适用</div>
          <p class="small" style="margin-top:8px;color:var(--ink-2)">{{ blocked.reason }}</p>
        </div>

        <div class="card" style="margin-top:20px">
          <div class="h3">你可以这样做</div>
          <a class="opt call-row" href="tel:4008208866" style="padding-top:12px">
            <span class="call-ic"><Icon name="phone" :size="15" /></span>
            <span class="main"><span class="l">拨打客服电话咨询</span><span class="d">400-820-8866 · 确认是否有其他可用的服务权益</span></span>
            <Icon class="chev" name="chevron" :size="17" />
          </a>
          <div class="opt">
            <span class="main"><span class="l">联系医院安排救护车</span><span class="d">需要医疗支持或病情不稳定时，请由医院安排</span></span>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn-ghost" style="flex:1" @click="blocked = null">重新选择</button>
          <button class="btn btn-primary" style="flex:1" @click="router.push('/')">返回首页</button>
        </div>
      </template>

      <!-- 问答 -->
      <template v-else>
        <div class="q-head">
          <div class="q-step tiny muted num">第 {{ step + 1 }} / {{ questions.length }} 项</div>
          <h1 class="h1" style="font-size:23px;margin-top:6px">{{ current.title }}</h1>
          <p class="small muted" style="margin-top:6px">{{ current.desc }}</p>
        </div>

        <div class="q-list">
          <button v-for="o in current.options" :key="o.value" class="q-opt"
                  :class="{ on: answers[current.key]?.value === o.value }" @click="choose(o)">
            <span class="q-label">{{ o.label }}</span>
            <span class="q-radio"><Icon v-if="answers[current.key]?.value === o.value" name="check" :size="14" /></span>
          </button>
        </div>

        <button v-if="step > 0" class="q-back small muted" @click="step--">
          <Icon name="back" :size="15" /> 上一项
        </button>

        <p class="tiny muted" style="margin-top:28px;line-height:1.7">
          以上信息将作为服务受理依据。如实际情况与所选不符，服务方有权在核验后拒绝提供服务。
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.q-head { padding: 22px 2px 4px; }
.q-step {
  display: inline-block; padding: 4px 10px; border-radius: 8px;
  background: var(--brand-tint); color: var(--brand-ink); font-weight: 600;
}
.q-list { margin-top: 20px; display: grid; gap: 10px; }
.q-opt {
  display: flex; align-items: center; gap: 12px; text-align: left;
  padding: 17px 16px; border-radius: 18px;
  background: var(--card); border: 1px solid rgba(255, 255, 255, .95);
  box-shadow: var(--shadow-sm); font-size: 15.5px; font-weight: 500; line-height: 1.4;
  transition: border-color .15s, background .15s, transform .12s;
}
.q-opt:active { transform: scale(.988); }
.q-opt.on { border-color: var(--brand-line); background: rgba(255, 247, 240, .96); box-shadow: 0 6px 18px rgba(255, 102, 0, .1); }
.q-label { flex: 1; }
.q-radio {
  width: 23px; height: 23px; border-radius: 50%; border: 1.5px solid rgba(60, 60, 67, .22);
  display: grid; place-items: center; flex: none; color: #fff; transition: all .15s;
}
.q-opt.on .q-radio { background: var(--grad); border-color: transparent; box-shadow: 0 3px 8px rgba(255, 90, 0, .26); }
.q-back { display: inline-flex; align-items: center; gap: 4px; margin-top: 18px; padding: 6px 0; font-size: 13px; color: var(--ink-3); }
.reapply { display: block; width: 100%; margin-top: 12px; font-size: 12px; color: var(--ink-3); text-align: center; padding: 6px; }
.block { text-align: center; display: flex; flex-direction: column; align-items: center; }
.block-icon { width: 60px; height: 60px; border-radius: 50%; background: var(--red-tint); color: var(--red); display: grid; place-items: center; }

/* 可拨号行：整行点击即调起系统拨号 */
.call-row { text-decoration: none; color: inherit; }
.call-ic {
  width: 30px; height: 30px; border-radius: 10px; flex: none; display: grid; place-items: center;
  background: var(--brand-tint); color: var(--brand); border: 1px solid var(--brand-line);
}
.call-row:active { opacity: .7; }
</style>
