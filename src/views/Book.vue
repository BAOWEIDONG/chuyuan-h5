<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import ProgressDots from '../components/ProgressDots.vue'
import HospitalPicker from '../components/HospitalPicker.vue'
import AddressPicker from '../components/AddressPicker.vue'
import DatePicker from '../components/DatePicker.vue'
import TimePicker from '../components/TimePicker.vue'
import Stepper from '../components/Stepper.vue'
import PickerSheet from '../components/PickerSheet.vue'
import { draft, recomputeTrip } from '../store/draft.js'
import { store } from '../store/orders.js'
import { session } from '../store/session.js'
import { hospitalsOf, hospitalById } from '../data/hospitals.js'
import { checkHospital, checkStay, checkTravelDate, checkPassengers, allowedTravelDates, tripTypeOf } from '../rules/eligibility.js'
import { addDays, ymd, ymdCn, parseYmd, formatDateTime } from '../rules/time.js'

const router = useRouter()

const hospital = computed(() => hospitalById(draft.hospitalId))
const address = computed(() => store.address)

const hospitalOpen = ref(false)
const addressOpen = ref(false)
const admissionOpen = ref(false)
const dischargeOpen = ref(false)
const travelOpen = ref(false)
const timeOpen = ref(false)
const contactOpen = ref(false)
const vehicleOpen = ref(false)

const errors = ref({})

/* ---------- 日期候选 ---------- */
const today = new Date()

const admissionDates = computed(() => {
  const out = []
  for (let i = 30; i >= 1; i--) out.push(addDays(today, -i))
  out.push(today)
  return out
})

const dischargeDates = computed(() => {
  const start = draft.admissionDate ? parseYmd(draft.admissionDate) : today
  const out = []
  for (let i = 1; i <= 8; i++) out.push(addDays(start, i))
  return out.filter(d => d >= today || ymd(d) === ymd(today))
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
const contactType = ref('self')
const contactOptions = [
  { value: 'self', label: '本人', desc: '使用被保险人预留手机号' },
  { value: 'family', label: '家属', desc: '填写家属姓名与手机号' }
]
watch(contactType, (v) => {
  if (v === 'self') {
    draft.contactName = session.member?.memberName || ''
    draft.contactPhone = session.member?.mobile || ''
  } else {
    draft.contactName = ''
    draft.contactPhone = ''
  }
  validate()
}, { immediate: true })


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
  if (!draft.contactName) e.contact = '请填写联系人'
  if (!draft.contactPhone) e.contact = '请填写手机号'
  else if (!phoneValid.value) e.contact = '手机号格式不正确'
  errors.value = e
  return Object.keys(e).length === 0
}

const tripLabel = computed(() => (draft.distanceKm ? (draft.tripType === 'long' ? '长途' : '短途') : ''))
const valid = computed(() => Object.keys(errors.value).length === 0)

function next() {
  if (!validate()) {
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
      <div class="card" style="padding:4px 16px">
        <button class="field" :class="{ err: errors.hospital }" @click="hospitalOpen = true">
          <span class="label">就诊医院</span>
          <span class="value" :class="{ placeholder: !hospital }">
            {{ hospital ? hospital.name : '搜索选择医院' }}
            <span v-if="hospital" class="hint">{{ hospital.city }}{{ hospital.district }} · {{ hospLevel }}</span>
            <span v-if="errors.hospital" class="hint" style="color:var(--seal)">{{ errors.hospital }}</span>
          </span>
          <Icon class="chev" name="chevron" :size="17" />
        </button>

        <button class="field" :class="{ err: errors.admission }" @click="admissionOpen = true">
          <span class="label">入院日期</span>
          <span class="value" :class="{ placeholder: !draft.admissionDate }">{{ draft.admissionDate || '选择日期' }}</span>
          <Icon class="chev" name="calendar" :size="17" />
        </button>

        <button class="field" :class="{ err: errors.discharge }" @click="draft.admissionDate && (dischargeOpen = true)">
          <span class="label">出院日期</span>
          <span class="value" :class="{ placeholder: !draft.dischargeDate }">
            {{ draft.dischargeDate || '选择日期' }}
            <span v-if="errors.discharge" class="hint" style="color:var(--seal)">{{ errors.discharge }}</span>
            <span v-else-if="!draft.admissionDate" class="hint">请先选择入院日期</span>
          </span>
          <Icon class="chev" name="calendar" :size="17" />
        </button>
      </div>

      <!-- 目的地 -->
      <div class="section-title"><span class="t">目的地</span><span class="s">仅支持家庭常住地</span></div>
      <div class="card" style="padding:4px 16px">
        <button class="field" :class="{ err: errors.address }" @click="addressOpen = true">
          <span class="label">家庭常住地</span>
          <span class="value" :class="{ placeholder: !address }">
            <template v-if="address">
              {{ address.province }}{{ address.city }}{{ address.district }}
              <span class="hint">{{ address.community }}{{ address.detail }}</span>
            </template>
            <template v-else>选择或登记地址</template>
            <span v-if="errors.address" class="hint" style="color:var(--seal)">{{ errors.address }}</span>
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
      <div class="card" style="padding:4px 16px">
        <button class="field" :class="{ err: errors.travel }" @click="travelDates.length && (travelOpen = true)">
          <span class="label">出行日期</span>
          <span class="value" :class="{ placeholder: !draft.travelDate }">
            {{ draft.travelDate ? draft.travelDate + '（' + ['周日','周一','周二','周三','周四','周五','周六'][parseYmd(draft.travelDate).getDay()] + '）' : '选择日期' }}
            <span v-if="errors.travel" class="hint" style="color:var(--seal)">{{ errors.travel }}</span>
            <span v-else-if="!draft.dischargeDate" class="hint">选好出院日期后可选择</span>
            <span v-else class="hint">限出院当天及之后 2 个自然日内</span>
          </span>
          <Icon class="chev" name="calendar" :size="17" />
        </button>

        <button class="field" :class="{ err: errors.time }" @click="timeOpen = true">
          <span class="label">出行时间</span>
          <span class="value" :class="{ placeholder: !draft.travelTime }">
            {{ draft.travelTime || '选择时间' }}
            <span v-if="errors.time" class="hint" style="color:var(--seal)">{{ errors.time }}</span>
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

      <!-- 联系人 -->
      <div class="section-title"><span class="t">联系人</span><span class="s">用于服务商确认行程</span></div>
      <div class="card" style="padding:4px 16px">
        <button class="field" @click="contactOpen = true">
          <span class="label">联系人</span>
          <span class="value">{{ contactType === 'self' ? '本人' : '家属' }}</span>
          <Icon class="chev" name="chevron" :size="17" />
        </button>
        <div v-if="contactType === 'family'" class="field">
          <span class="label">姓名</span>
          <input v-model="draft.contactName" class="value input" placeholder="填写家属姓名" maxlength="12" />
        </div>
        <div class="field" :class="{ err: errors.contact }">
          <span class="label">手机号</span>
          <input v-model="draft.contactPhone" class="value input" placeholder="填写 11 位手机号" inputmode="numeric" maxlength="11" />
        </div>
        <p v-if="errors.contact" class="tiny" style="color:var(--seal);padding:8px 0">{{ errors.contact }}</p>
      </div>

      <p class="tiny muted" style="margin:22px 4px 0;line-height:1.7">
        行程仅支持从本次住院医院单次直达家庭常住地，不支持绕行、多点停靠、中途停留或变更目的地。
      </p>
    </div>

    <div class="action-bar">
      <button class="btn btn-primary" :disabled="!valid" @click="next">
        {{ valid ? '下一步' : '请完成必填项' }}
      </button>
    </div>

    <HospitalPicker v-model:open="hospitalOpen" :model-value="hospital" @select="pickHospital" />
    <AddressPicker v-model:open="addressOpen" :model-value="address" @save="saveAddress" />
    <DatePicker v-model:open="admissionOpen" title="选择入院日期" :dates="admissionDates" :model-value="draft.admissionDate"
                disabled-hint="仅可选择最近 30 天内的入院日期" @update:model-value="pickAdmission" />
    <DatePicker v-model:open="dischargeOpen" title="选择出院日期" :dates="dischargeDates" :model-value="draft.dischargeDate"
                disabled-hint="出院日期需晚于入院日期" @update:model-value="pickDischarge" />
    <DatePicker v-model:open="travelOpen" title="选择出行日期" :dates="travelDates" :model-value="draft.travelDate"
                disabled-hint="仅限出院当天及之后 2 个自然日内" @update:model-value="pickTravel" />
    <TimePicker v-model:open="timeOpen" :model-value="draft.travelTime" @update:model-value="v => (draft.travelTime = v, validate())" />
    <PickerSheet v-model:open="contactOpen" title="选择联系人" :options="contactOptions" :model-value="contactType"
                 :searchable="false" @update:model-value="v => contactType = v" />
  </div>
</template>

<style scoped>
.input { border: 0; outline: none; background: transparent; font-size: 15px; padding: 0; }
.input::placeholder { color: #A9B2B6; }
</style>
