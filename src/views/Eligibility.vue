<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
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
          <button class="reapply" @click="bypass = true">演示用：以另一次住院重新申请</button>
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
          <div class="opt" style="padding-top:12px">
            <span class="main"><span class="l">拨打 95511-7 咨询</span><span class="d">确认是否有其他可用的服务权益</span></span>
            <Icon class="chev" name="chevron" :size="17" />
          </div>
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
.q-head { padding: 26px 2px 6px; }
.q-step { letter-spacing: .04em; }
.q-list { margin-top: 18px; display: grid; gap: 10px; }
.q-opt {
  display: flex; align-items: center; gap: 12px; text-align: left;
  padding: 17px 16px; border-radius: 12px; border: 1px solid var(--line);
  background: var(--card); font-size: 15px; line-height: 1.4;
  transition: border-color .15s, background .15s;
}
.q-opt.on { border-color: var(--brand); background: var(--brand-tint); }
.q-label { flex: 1; }
.q-radio { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--line-strong); display: grid; place-items: center; flex: none; color: #fff; }
.q-opt.on .q-radio { background: var(--brand); border-color: var(--brand); }
.q-back { display: inline-flex; align-items: center; gap: 4px; margin-top: 18px; padding: 6px 0; }
.reapply { display: block; width: 100%; margin-top: 12px; font-size: 12px; color: var(--ink-3); text-align: center; padding: 6px; }
.block { text-align: center; display: flex; flex-direction: column; align-items: center; }
.block-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--seal-tint); color: var(--seal); display: grid; place-items: center; }
</style>
