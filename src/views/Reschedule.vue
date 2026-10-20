<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import DatePicker from '../components/DatePicker.vue'
import TimePicker from '../components/TimePicker.vue'
import PickerSheet from '../components/PickerSheet.vue'
import { store } from '../store/orders.js'
import { allowedTravelDates, checkTravelDate } from '../rules/eligibility.js'
import { parseYmd, addDays, workHoursBetween, formatDateTime } from '../rules/time.js'

const route = useRoute()
const router = useRouter()
const order = computed(() => store.getOrder(route.params.id))

const newDate = ref(order.value?.travelDate || '')
const newTime = ref(order.value?.travelTime || '')
const reason = ref('')
const submitted = ref(false)
const dateOpen = ref(false)
const timeOpen = ref(false)
const reasonOpen = ref(false)

const REASONS = [
  { value: 'hospital', label: '医院出院时间调整' },
  { value: 'traffic', label: '交通或天气原因' },
  { value: 'family', label: '家属时间不方便' },
  { value: 'other', label: '其他原因' }
]

const dates = computed(() => order.value ? allowedTravelDates(order.value.dischargeDate) : [])

// 出行时间必须以"约定时间"为基准提前 4 个工作小时
const originalMoment = computed(() => {
  if (!order.value) return null
  const d = parseYmd(order.value.travelDate)
  const [h, m] = order.value.travelTime.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
})
const newMoment = computed(() => {
  if (!newDate.value || !newTime.value) return null
  const d = parseYmd(newDate.value)
  const [h, m] = newTime.value.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
})

const leadHours = computed(() => {
  if (!originalMoment.value) return 0
  return workHoursBetween(new Date(), originalMoment.value)
})

const tooLate = computed(() => leadHours.value < 4)
const unchanged = computed(() => order.value && newDate.value === order.value.travelDate && newTime.value === order.value.travelTime)
const dateErr = computed(() => order.value ? checkTravelDate(order.value.dischargeDate, newDate.value) : null)
const valid = computed(() => newDate.value && newTime.value && !dateErr.value && !unchanged.value && !tooLate.value && reason.value)

const count = computed(() => order.value?.rescheduleCount || 0)
const overLimit = computed(() => count.value >= 2)

function submit() {
  if (!valid.value || overLimit.value) return
  const o = order.value
  const label = REASONS.find(r => r.value === reason.value)?.label
  store.updateOrder(o.id, {
    travelDate: newDate.value,
    travelTime: newTime.value,
    rescheduleCount: count.value + 1,
    timeline: [...o.timeline, {
      code: 'RESCHEDULED', label: '变更出行时间',
      desc: `${o.travelDate} ${o.travelTime} → ${newDate.value} ${newTime.value}（${label}）`,
      at: new Date().toISOString(), actor: '客户', level: 'warn'
    }]
  })
  store.pushMessage({
    type: 'system', title: '出行时间已变更',
    body: `已变更为 ${newDate.value} ${newTime.value}，服务商将重新确认车辆安排。`, orderId: o.id
  })
  submitted.value = true
  setTimeout(() => router.replace('/order/' + o.id), 900)
}
</script>

<template>
  <div v-if="order">
    <NavBar title="变更出行时间" :back="'/order/' + order.id" />
    <div class="page with-bar">
      <div class="alert info" style="margin-top:16px">
        <Icon name="info" :size="17" />
        <span>变更须在约定时间前 4 个工作小时提出（服务时间 9:00–21:00）。出行日期仍需在出院当天及之后 2 个自然日内。</span>
      </div>

      <div class="card" style="margin-top:14px;padding:4px 16px">
        <div class="field">
          <span class="label">当前安排</span>
          <span class="value">{{ order.travelDate }} {{ order.travelTime }}</span>
        </div>
        <button class="field" :class="{ err: !!dateErr }" @click="dateOpen = true">
          <span class="label">新的日期</span>
          <span class="value" :class="{ placeholder: !newDate }">
            {{ newDate || '选择日期' }}
            <span v-if="dateErr" class="hint" style="color:var(--seal)">{{ dateErr.text }}</span>
          </span>
          <Icon class="chev" name="calendar" :size="17" />
        </button>
        <button class="field" @click="timeOpen = true">
          <span class="label">新的时间</span>
          <span class="value" :class="{ placeholder: !newTime }">{{ newTime || '选择时间' }}</span>
          <Icon class="chev" name="clock" :size="17" />
        </button>
        <button class="field" @click="reasonOpen = true">
          <span class="label">变更原因</span>
          <span class="value" :class="{ placeholder: !reason }">{{ reason ? REASONS.find(r => r.value === reason).label : '选择原因' }}</span>
          <Icon class="chev" name="chevron" :size="17" />
        </button>
      </div>

      <div v-if="tooLate" class="alert danger" style="margin-top:14px">
        <Icon name="alert" :size="17" />
        <span>距离约定时间不足 4 个工作小时，无法自助变更。请联系服务商或平台客服协调。</span>
      </div>
      <div v-if="overLimit" class="alert danger" style="margin-top:14px">
        <Icon name="alert" :size="17" />
        <span>本次申请已变更 2 次，如需再次调整请联系平台客服。</span>
      </div>

      <div class="summary" v-if="newMoment && !dateErr && !unchanged">
        <span class="tiny muted">变更后</span>
        <div class="sm-val">{{ newDate }} {{ newTime }}</div>
        <div class="sm-note">服务商将重新确认车辆与司机，确认后通知你</div>
      </div>

      <p class="tiny muted" style="margin:20px 4px 0;line-height:1.7">
        如未能提前变更，服务方会尽力按最新时间安排，但因客观原因无法提供时，不承担相关服务责任。
      </p>
    </div>

    <div class="action-bar">
      <button class="btn btn-primary" :disabled="!valid || overLimit" @click="submit">
        {{ submitted ? '已提交' : (tooLate ? '已超过可变更时间' : (unchanged ? '时间未变化' : '确认变更')) }}
      </button>
    </div>

    <DatePicker v-model:open="dateOpen" title="选择新的出行日期" :dates="dates" :model-value="newDate"
                disabled-hint="仅限出院当天及之后 2 个自然日内" @update:model-value="v => newDate = v" />
    <TimePicker v-model:open="timeOpen" :model-value="newTime" @update:model-value="v => newTime = v" />
    <PickerSheet v-model:open="reasonOpen" title="变更原因" :options="REASONS" :model-value="reason"
                 :searchable="false" @update:model-value="v => reason = v" />
  </div>
</template>

<style scoped>
.summary { margin-top: 18px; padding: 14px 16px; border-radius: 12px; background: var(--brand-tint); }
.sm-val { font-family: var(--serif); font-size: 20px; font-weight: 700; color: var(--brand-deep); margin-top: 3px; }
.sm-note { font-size: 12px; color: #3E6B62; margin-top: 4px; }
</style>
