<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import CallLink from '../components/CallLink.vue'
import NavBar from '../components/NavBar.vue'
import ProgressDots from '../components/ProgressDots.vue'
import HospitalPicker from '../components/HospitalPicker.vue'
import AddressPicker from '../components/AddressPicker.vue'
import DatePicker from '../components/DatePicker.vue'
import TimePicker from '../components/TimePicker.vue'
import Stepper from '../components/Stepper.vue'
import { draft, recomputeTrip } from '../store/draft.js'
import { store } from '../store/orders.js'
import { session } from '../store/session.js'
import { hospitalsOf, hospitalById } from '../data/hospitals.js'
import { checkHospital, checkStay, checkTravelDate, checkPassengers, allowedTravelDates, tripTypeOf } from '../rules/eligibility.js'
import { addDays, ymd, ymdCn, parseYmd, startOfDay, diffDays, formatDateTime } from '../rules/time.js'

const router = useRouter()

const hospital = computed(() => hospitalById(draft.hospitalId))
const address = computed(() => store.address)

const hospitalOpen = ref(false)
const addressOpen = ref(false)
const admissionOpen = ref(false)
const dischargeOpen = ref(false)
const travelOpen = ref(false)
const timeOpen = ref(false)
const vehicleOpen = ref(false)

const errors = ref({})
const showErr = ref(false)  // 进页面不飘红，点下一步后才提示

/* ---------- 日期候选 ---------- */
const today = new Date()

const admissionDates = computed(() => {
  const out = []
  for (let i = 30; i >= 1; i--) out.push(addDays(today, -i))
  out.push(today)
  return out
})

// 出院日期按"今天"往后排，而不是从入院日期加固定天数：
// 住院时间可能很长（例如入院已 30 天），从入院日加 1~8 天会全部落在过去，弹层就空着。
// 约束只有两条：晚于入院日期、最多提前 7 天预约（R05）。
const dischargeDates = computed(() => {
  const a = draft.admissionDate ? parseYmd(draft.admissionDate) : null
  const out = []
  for (let i = 0; i <= 7; i++) {
    const d = addDays(today, i)
    if (a && diffDays(a, d) < 1) continue // 当日出入院不支持，需至少隔 1 天
    out.push(d)
  }
  return out
})

const dischargeHint = computed(() => {
  if (!draft.admissionDate) return '请先选择入院日期'
  if (!dischargeDates.value.length) return '入院日期为今天，出院日期最早为明天'
  return `需晚于入院日期（${draft.admissionDate}），且最多提前 7 天预约`
})

const travelDates = computed(() => {
  if (!draft.dischargeDate) return []
  return allowedTravelDates(draft.dischargeDate).filter(d => d >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
})

/* ---------- 交互 ---------- */
function pickHospital(h) {
  draft.hospitalId = h.id
  // 换医院后重算里程
  if (address.value) recomputeTrip(h.city, address.value.city)
  validate()
}
function saveAddress(a) {
  store.setAddress(a)
  draft.address = a
  if (hospital.value) recomputeTrip(hospital.value.city, a.city)
  validate()
}

// 换过医院或改过地址后都重算一次，避免里程为空
watch([() => draft.hospitalId, () => store.address], () => {
  const h = hospitalById(draft.hospitalId)
  if (h && store.address) recomputeTrip(h.city, store.address.city)
}, { immediate: true })
function pickAdmission(v) {
  draft.admissionDate = v
  // 出院必须晚于入院
  if (draft.dischargeDate && parseYmd(draft.dischargeDate) <= parseYmd(v)) draft.dischargeDate = ''
  draft.travelDate = ''
  validate()
}
function pickDischarge(v) {
  draft.dischargeDate = v
  if (draft.travelDate && !travelDates.value.some(d => ymd(d) === draft.travelDate)) draft.travelDate = ''
  validate()
}
function pickTravel(v) { draft.travelDate = v; validate() }

/* ---------- 特殊需求 ---------- */
const NEEDS = [
  { value: 'assist', label: '协助出院', desc: '协助办理出院手续、病床转移至车辆' },
  { value: 'lieflat', label: '需要平躺', desc: '需主诊医生开具证明' },
  { value: 'wheelchair', label: '需要轮椅', desc: '车辆配备轮椅或协助上下车' },
  { value: 'childseat', label: '儿童座椅', desc: '随行有 12 岁以下儿童' },
  { value: 'stair', label: '需要搀扶上楼', desc: '到达后协助上楼' }
]
const needOptions = computed(() => NEEDS.map(n => ({ ...n, value: n.value })))

function toggleNeed(v) {
  const i = draft.needs.indexOf(v)
  if (i >= 0) draft.needs.splice(i, 1)
  else draft.needs.push(v)
  draft.lieFlatRequired = draft.needs.includes('lieflat')
  draft.assistDischarge = draft.needs.includes('assist')
  if (draft.lieFlatRequired) draft.vehicleType = 'V-L1'
  else if (String(draft.vehicleType).startsWith('V-L')) draft.vehicleType = 'V-S1'
  validate()
}

const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(draft.contactPhone || ''))

/* ---------- 联系人 ---------- */
// 只有被保险人本人使用本服务，联系电话直接取保单预留手机号
draft.contactName = session.member?.memberName || ''
draft.contactPhone = session.member?.mobile || ''


/* ---------- 校验 ---------- */
function validate() {
  const e = {}
  const h = hospital.value
  if (!h) e.hospital = '请选择就诊医院'
  else {
    const he = checkHospital(h)
    if (he) e.hospital = he.text
  }
  if (!draft.admissionDate) e.admission = '请选择入院日期'
  if (!draft.dischargeDate) e.discharge = '请选择出院日期'
  if (draft.admissionDate && draft.dischargeDate) {
    const se = checkStay(draft.admissionDate, draft.dischargeDate)
    if (se.length) e.discharge = se[0].text
  }
  if (!address.value) e.address = '请登记家庭常住地'
  if (!draft.travelDate) e.travel = '请选择出行日期'
  else {
    const te = checkTravelDate(draft.dischargeDate, draft.travelDate)
    if (te) e.travel = te.text
  }
  if (!draft.travelTime) e.time = '请选择出行时间'
  const pe = checkPassengers(draft.tripType, draft.passengerCount)
  if (pe) e.passenger = pe.text
  if (!phoneValid.value) e.contact = '保单预留手机号有误，请联系客服更新'
  errors.value = e
  return Object.keys(e).length === 0
}

const tripLabel = computed(() => (draft.distanceKm ? (draft.tripType === 'long' ? '长途' : '短途') : ''))
const valid = computed(() => Object.keys(errors.value).length === 0)

function next() {
  if (!validate()) {
    showErr.value = true
    const first = document.querySelector('.err-anchor')
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  router.push('/book/plan')
}

const hospLevel = computed(() => hospital.value ? `${hospital.value.level} · ${hospital.value.nature}` : '')
</script>

<template>
  <div>
    <NavBar title="预约出院交通" back="/" />
    <div class="page with-bar">
      <ProgressDots :total="4" :current="1" :labels="['预约信息', '车型确认', '材料上传', '提交']" />

      <!-- 医院 -->
      <div class="section-title"><span class="t">就诊与住院</span><span class="s">按出院小结填写</span></div>
      <div class="card" style="padding:2px 16px">
        <button class="field" :class="{ err: showErr && errors.hospital }" @click="hospitalOpen = true">
          <span class="label">就诊医院</span>
          <span class="value" :class="{ placeholder: !hospital }">
            {{ hospital ? hospital.name : '搜索选择医院' }}
            <span v-if="hospital" class="hint">{{ hospital.city }}{{ hospital.district }} · {{ hospLevel }}</span>
            <span v-if="showErr && errors.hospital" class="hint" style="color:var(--seal)">{{ errors.hospital }}</span>
          </span>
          <Icon class="chev" name="chevron" :size="17" />
        </button>

        <button class="field" :class="{ err: showErr && errors.admission }" @click="admissionOpen = true">
          <span class="label">入院日期</span>
          <span class="value" :class="{ placeholder: !draft.admissionDate }">{{ draft.admissionDate || '选择日期' }}</span>
          <Icon class="chev" name="calendar" :size="17" />
        </button>

        <button class="field" :class="{ err: showErr && errors.discharge }" @click="draft.admissionDate && (dischargeOpen = true)">
          <span class="label">出院日期</span>
          <span class="value" :class="{ placeholder: !draft.dischargeDate }">
            {{ draft.dischargeDate || '选择日期' }}
            <span v-if="showErr && errors.discharge" class="hint" style="color:var(--seal)">{{ errors.discharge }}</span>
            <span v-else-if="!draft.admissionDate" class="hint">请先选择入院日期</span>
          </span>
          <Icon class="chev" name="calendar" :size="17" />
        </button>
      </div>

      <!-- 目的地 -->
      <div class="section-title"><span class="t">目的地</span><span class="s">仅支持家庭常住地</span></div>
      <div class="card" style="padding:2px 16px">
        <button class="field" :class="{ err: showErr && errors.address }" @click="addressOpen = true">
          <span class="label">家庭常住地</span>
          <span class="value" :class="{ placeholder: !address }">
            <template v-if="address">
              {{ address.province }}{{ address.city }}{{ address.district }}
              <span class="hint">{{ address.community }}{{ address.detail }}</span>
            </template>
            <template v-else>选择或登记地址</template>
            <span v-if="showErr && errors.address" class="hint" style="color:var(--seal)">{{ errors.address }}</span>
          </span>
          <span v-if="address" class="badge muted">已登记</span>
          <Icon v-else class="chev" name="chevron" :size="17" />
        </button>
      </div>
      <p class="tiny muted" style="margin:8px 4px 0;line-height:1.6">
        家庭常住地指户籍所在地或连续居住 12 个月以上的经常居住地，仅可登记一次，后续不可修改。
      </p>

      <!-- 行程 -->
      <div class="section-title"><span class="t">出行安排</span><span class="s" v-if="tripLabel">{{ tripLabel }} · 测算 {{ draft.distanceKm }} 公里</span></div>
      <div class="card" style="padding:2px 16px">
        <button class="field" :class="{ err: showErr && errors.travel }" @click="travelDates.length && (travelOpen = true)">
          <span class="label">出行日期</span>
          <span class="value" :class="{ placeholder: !draft.travelDate }">
            {{ draft.travelDate ? draft.travelDate + '（' + ['周日','周一','周二','周三','周四','周五','周六'][parseYmd(draft.travelDate).getDay()] + '）' : '选择日期' }}
            <span v-if="showErr && errors.travel" class="hint" style="color:var(--seal)">{{ errors.travel }}</span>
            <span v-else-if="!draft.dischargeDate" class="hint">选好出院日期后可选择</span>
            <span v-else class="hint">限出院当天及之后 2 个自然日内</span>
          </span>
          <Icon class="chev" name="calendar" :size="17" />
        </button>

        <button class="field" :class="{ err: showErr && errors.time }" @click="timeOpen = true">
          <span class="label">出行时间</span>
          <span class="value" :class="{ placeholder: !draft.travelTime }">
            {{ draft.travelTime || '选择时间' }}
            <span v-if="showErr && errors.time" class="hint" style="color:var(--seal)">{{ errors.time }}</span>
          </span>
          <Icon class="chev" name="clock" :size="17" />
        </button>

        <div class="field">
          <span class="label">同行人数</span>
          <span class="value">
            <Stepper v-model="draft.passengerCount" :min="1" :max="draft.tripType === 'long' ? 2 : 6" label="人"
                     :hint="draft.tripType === 'long' ? '长途仅承担被保人及 1 名家属' : '含被保人本人'" />
          </span>
        </div>

        <div class="field">
          <span class="label">行李件数</span>
          <span class="value">
            <Stepper v-model="draft.luggage" :min="0" :max="8" label="件" hint="大件行李请提前告知" />
          </span>
        </div>
      </div>

      <!-- 特殊需求 -->
      <div class="section-title"><span class="t">特殊需求</span><span class="s">可多选</span></div>
      <div class="card">
        <div class="chip-row">
          <button v-for="n in needOptions" :key="n.value" class="chip" :class="{ on: draft.needs.includes(n.value) }" @click="toggleNeed(n.value)">
            {{ n.label }}
          </button>
        </div>
        <p class="tiny muted" style="margin:10px 0 0">
          {{ draft.lieFlatRequired ? '已选择平躺需求，需在材料页上传主诊医生证明。' : '如需平躺，需主诊医生开具证明后方可安排。' }}
        </p>
      </div>

      <!-- 联系人：被保险人本人，手机号取自保单 -->
      <div class="section-title"><span class="t">联系电话</span><span class="s">服务商联系你时使用</span></div>
      <div class="card" style="padding:2px 16px">
        <div class="field">
          <span class="label">联系人</span>
          <span class="value">{{ session.member?.memberName || '本人' }}<span class="hint">被保险人本人</span></span>
        </div>
        <div class="field">
          <span class="label">手机号</span>
          <span class="value num">{{ draft.contactPhone || session.member?.mobile }}</span>
        </div>
      </div>
      <p class="tiny muted" style="margin:10px 4px 0;line-height:1.7">
        手机号取自保单预留号码。如已变更，请拨打 <CallLink inline bare :icon="false" /> 更新后再预约。
      </p>

      <p class="tiny muted" style="margin:22px 4px 0;line-height:1.7">
        行程仅支持从本次住院医院单次直达家庭常住地，不支持绕行、多点停靠、中途停留或变更目的地。
      </p>
    </div>

    <div class="action-bar">
      <button class="btn" :class="valid ? 'btn-primary' : 'btn-wait'" @click="next">
        {{ valid ? '下一步' : '请完成必填项' }}
      </button>
    </div>

    <HospitalPicker v-model:open="hospitalOpen" :model-value="hospital" @select="pickHospital" />
    <AddressPicker v-model:open="addressOpen" :model-value="address" @save="saveAddress" />
    <DatePicker v-model:open="admissionOpen" title="选择入院日期" :dates="admissionDates" :model-value="draft.admissionDate"
                disabled-hint="仅可选择最近 30 天内的入院日期" @update:model-value="pickAdmission" />
    <DatePicker v-model:open="dischargeOpen" title="选择出院日期" :dates="dischargeDates" :model-value="draft.dischargeDate"
                :disabled-hint="dischargeHint" @update:model-value="pickDischarge" />
    <DatePicker v-model:open="travelOpen" title="选择出行日期" :dates="travelDates" :model-value="draft.travelDate"
                disabled-hint="仅限出院当天及之后 2 个自然日内" @update:model-value="pickTravel" />
    <TimePicker v-model:open="timeOpen" :model-value="draft.travelTime" @update:model-value="v => (draft.travelTime = v, validate())" />
  </div>
</template>

<style scoped>
.input { border: 0; outline: none; background: transparent; font-size: 15.5px; padding: 0; min-width: 0; }
.input::placeholder { color: var(--ink-3); font-weight: 400; }
</style>
