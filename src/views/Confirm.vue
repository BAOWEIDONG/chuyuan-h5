<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import ProgressDots from '../components/ProgressDots.vue'
import { draft, clearDraft } from '../store/draft.js'
import { store } from '../store/orders.js'
import { session } from '../store/session.js'
import { hospitalById } from '../data/hospitals.js'
import { submitOrder } from '../store/createOrder.js'
import { collectWarnings } from '../rules/warnings.js'
import { VEHICLES } from '../data/providers.js'
import { checkHospital, checkStay, checkTravelDate, checkPassengers } from '../rules/eligibility.js'

const router = useRouter()
const hospital = computed(() => hospitalById(draft.hospitalId))
const address = computed(() => store.address)
const agreed = ref(false)
const submitting = ref(false)
const showRules = ref(false)

const warnings = computed(() => collectWarnings(draft))

const vehicleName = computed(() => {
  const all = [...VEHICLES.sedan, ...VEHICLES.mpv, ...VEHICLES.lieflat]
  return all.find(v => v.id === draft.vehicleType)?.name || '—'
})

// 提交前总校验：任一硬规则不通过就定位问题，不允许提交
const problems = computed(() => {
  const out = []
  const he = checkHospital(hospital.value)
  if (he) out.push({ step: '/book', text: he.text })
  const se = checkStay(draft.admissionDate, draft.dischargeDate)
  se.forEach(e => out.push({ step: '/book', text: e.text }))
  const te = checkTravelDate(draft.dischargeDate, draft.travelDate)
  if (te) out.push({ step: '/book', text: te.text })
  const pe = checkPassengers(draft.tripType, draft.passengerCount)
  if (pe) out.push({ step: '/book', text: pe.text })
  if (!draft.materials.hospital.length) out.push({ step: '/book/materials', text: '缺少住院材料' })
  if (!draft.materials.address.length) out.push({ step: '/book/materials', text: '缺少住址证明' })
  if (draft.lieFlatRequired && !draft.materials.doctor.length) out.push({ step: '/book/materials', text: '缺少平躺医嘱证明' })
  if (!address.value) out.push({ step: '/book', text: '缺少家庭常住地' })
  return out
})

const canSubmit = computed(() => agreed.value && problems.value.length === 0 && !submitting.value)

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  // 模拟受理请求，防连点
  setTimeout(() => {
    const order = submitOrder(draft, address.value)
    clearDraft()
    router.replace('/book/success/' + order.id)
  }, 700)
}

const needsLabel = computed(() => (draft.needs.length ? draft.needs.map(n => (n === 'assist' ? '协助出院' : n === 'lieflat' ? '平躺' : n === 'wheelchair' ? '轮椅' : n === 'childseat' ? '儿童座椅' : '搀扶上楼')).join('、') : '无'))
</script>

<template>
  <div>
    <NavBar title="核对并提交" back="/book/materials" />
    <div class="page with-bar">
      <ProgressDots :total="4" :current="4" :labels="['预约信息', '车型确认', '材料上传', '提交']" />

      <div v-if="problems.length" class="alert danger" style="margin-top:16px">
        <Icon name="alert" :size="17" />
        <div>
          <div style="font-weight:600;margin-bottom:2px">以下信息需要修正</div>
          <div v-for="(p, i) in problems" :key="i">{{ p.text }}</div>
        </div>
      </div>

      <!-- 行程摘要 -->
      <section class="receipt">
        <div class="rc-head">
          <div class="rc-title">行程确认</div>
          <span class="badge active">待提交</span>
        </div>

        <div class="rc-route">
          <div class="rc-point">
            <span class="rc-dot" />
            <div>
              <div class="rc-label">出发</div>
              <div class="rc-name">{{ hospital?.name }}</div>
              <div class="rc-addr">{{ hospital?.city }}{{ hospital?.district }} · {{ hospital?.level }}</div>
            </div>
          </div>
          <div class="rc-link" />
          <div class="rc-point">
            <span class="rc-dot hollow" />
            <div>
              <div class="rc-label">到达</div>
              <div class="rc-name">{{ address?.city }}{{ address?.district }}{{ address?.community }}</div>
              <div class="rc-addr">家庭常住地 · 单次直达</div>
            </div>
          </div>
        </div>

        <div class="rc-grid">
          <div class="rc-item"><span class="k">出行时间</span><span class="v num">{{ draft.travelDate }} {{ draft.travelTime }}</span></div>
          <div class="rc-item"><span class="k">同行人数</span><span class="v">{{ draft.passengerCount }} 人</span></div>
          <div class="rc-item"><span class="k">车型</span><span class="v">{{ vehicleName }}</span></div>
          <div class="rc-item"><span class="k">测算里程</span><span class="v num">{{ draft.distanceKm }} 公里 · {{ draft.tripType === 'long' ? '长途' : '短途' }}</span></div>
          <div class="rc-item"><span class="k">特殊需求</span><span class="v">{{ needsLabel }}</span></div>
          <div class="rc-item"><span class="k">联系电话</span><span class="v num">{{ draft.contactPhone }}</span></div>
        </div>

        <div class="rc-materials">
          <span class="k">材料</span>
          <span class="m">住院材料 {{ draft.materials.hospital.length }} 张 · 住址证明 {{ draft.materials.address.length }} 张<template v-if="draft.lieFlatRequired"> · 医嘱 {{ draft.materials.doctor.length }} 张</template></span>
        </div>
      </section>

      <div v-if="warnings.length" class="warn-list">
        <div v-for="w in warnings" :key="w.code" class="alert" :class="w.level === 'warn' ? 'warn' : 'info'">
          <Icon :name="w.level === 'warn' ? 'alert' : 'info'" :size="16" />
          <span>{{ w.text }}</span>
        </div>
      </div>

      <div class="agree" @click="agreed = !agreed">
        <span class="box" :class="{ on: agreed }"><Icon v-if="agreed" name="check" :size="13" /></span>
        <span class="small">我已阅读并同意<button class="link" @click.stop="showRules = true">《服务使用规则》</button>，确认以上信息真实有效</span>
      </div>

      <p class="tiny muted" style="margin:16px 2px 0;line-height:1.7">
        提交后服务方将在 12 个工作小时内响应材料，24 个工作小时内确认服务。服务时间为工作日 9:00–21:00。
      </p>
    </div>

    <div class="action-bar">
      <button class="btn" :class="canSubmit ? 'btn-primary' : 'btn-wait'" @click="submit">
        {{ submitting ? '正在提交…' : (problems.length ? '请先修正信息' : (!agreed ? '请阅读并同意服务规则' : '提交申请')) }}
      </button>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRules" class="mask" @click.self="showRules = false">
          <div class="sheet">
            <div class="sheet-head"><span class="t">服务使用规则</span><button class="close" @click="showRules = false"><Icon name="close" :size="18" /></button></div>
            <div class="sheet-body">
              <div class="rule"><b>服务内容</b><p>非医疗类、非急救类的普通交通接送，从本次住院医院单次直达家庭常住地。</p></div>
              <div class="rule"><b>使用次数</b><p>保单有效期内，同一次住院仅提供 1 次。</p></div>
              <div class="rule"><b>申请时间</b><p>须在出院前 24 小时提交，仅限出院当天及之后 2 个自然日内使用。</p></div>
              <div class="rule"><b>变更</b><p>需变更时间或内容，须在约定时间前 4 个工作小时通知服务商。</p></div>
              <div class="rule"><b>自行安排</b><p>自行安排交通视为放弃服务，不提供补贴或报销。</p></div>
              <div class="rule"><b>不予服务情形</b><p>需输液、吸氧、心电监护等医疗支持，病情危重或放弃治疗，转院及康复机构接送等。</p></div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.receipt {
  position: relative; margin-top: 16px; padding: 18px;
  background: var(--card); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid rgba(255, 255, 255, .96); border-radius: 24px; box-shadow: var(--shadow);
}
.rc-head { display: flex; justify-content: space-between; align-items: center; }
.rc-title { font-size: 17px; font-weight: 800; letter-spacing: .2px; }
.rc-route { margin: 18px 0 4px; }
.rc-point { display: flex; gap: 11px; align-items: flex-start; }
.rc-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--grad); margin-top: 5px; flex: none; box-shadow: 0 0 0 3px var(--brand-tint); }
.rc-dot.hollow { background: #fff; border: 1.5px solid rgba(60, 60, 67, .28); box-shadow: 0 0 0 3px var(--fill); }
.rc-link { width: 1px; height: 22px; background: repeating-linear-gradient(to bottom, rgba(60,60,67,.22) 0 3px, transparent 3px 6px); margin-left: 4px; }
.rc-label { font-size: 11px; color: var(--ink-3); }
.rc-name { font-size: 15.5px; font-weight: 600; line-height: 1.35; margin-top: 1px; }
.rc-addr { font-size: 12px; color: var(--ink-3); margin-top: 3px; }
.rc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
.rc-item { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rc-item .k { font-size: 11.5px; color: var(--ink-3); }
.rc-item .v { font-size: 14px; font-weight: 500; line-height: 1.4; }
.rc-materials { display: flex; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 12px; }
.rc-materials .k { color: var(--ink-3); flex: none; }
.rc-materials .m { color: var(--ink-2); line-height: 1.55; }
.warn-list { margin-top: 14px; }
.agree {
  display: flex; gap: 9px; align-items: flex-start; margin-top: 18px; padding: 14px 15px;
  border-radius: 16px; background: rgba(255, 255, 255, .7); border: 1px solid rgba(255, 255, 255, .95);
}
.agree .box { width: 20px; height: 20px; border-radius: 7px; border: 1.5px solid rgba(60,60,67,.24); display: grid; place-items: center; color: #fff; flex: none; margin-top: 1px; transition: all .15s; }
.agree .box.on { background: var(--grad); border-color: transparent; box-shadow: 0 3px 8px rgba(255, 90, 0, .26); }
.link { color: var(--brand-ink); text-decoration: underline; text-underline-offset: 2px; font-size: inherit; display: inline; font-weight: 600; }
.rule { margin-bottom: 16px; }
.rule b { font-size: 14px; font-weight: 700; }
.rule p { font-size: 13px; color: var(--ink-2); line-height: 1.7; margin: 4px 0 0; }
</style>
