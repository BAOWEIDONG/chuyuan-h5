<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import ProgressDots from '../components/ProgressDots.vue'
import PickerSheet from '../components/PickerSheet.vue'
import { draft } from '../store/draft.js'
import { store } from '../store/orders.js'
import { hospitalById } from '../data/hospitals.js'
import { VEHICLES } from '../data/providers.js'
import { LONG_TRIP_KM } from '../rules/eligibility.js'
import { collectWarnings } from '../rules/warnings.js'

const router = useRouter()
const hospital = computed(() => hospitalById(draft.hospitalId))
const address = computed(() => store.address)
const isLong = computed(() => draft.tripType === 'long')

const warnings = computed(() => collectWarnings(draft))
const showWarn = ref(true)

const vehicleOptions = computed(() => {
  const list = [...VEHICLES.sedan, ...VEHICLES.mpv]
  if (draft.lieFlatRequired) list.unshift(...VEHICLES.lieflat)
  return list.map(v => ({
    value: v.id,
    label: v.name,
    desc: `${v.desc} · 可坐 ${v.seats} 人 / 行李 ${v.luggage} 件`,
    tag: v.lieFlat ? '需医嘱' : v.wheelchair ? '可放轮椅' : ''
  }))
})

const vehicleLabel = computed(() => {
  const all = [...VEHICLES.sedan, ...VEHICLES.mpv, ...VEHICLES.lieflat]
  return all.find(v => v.id === draft.vehicleType)?.name || '请选择车型'
})

const vehicleOpen = ref(false)
const trainOpen = ref(false)

function pickVehicle(id) {
  const all = [...VEHICLES.sedan, ...VEHICLES.mpv, ...VEHICLES.lieflat]
  const v = all.find(x => x.id === id)
  if (!v) return
  draft.vehicleType = id
  draft.lieFlatRequired = v.lieFlat
  const i = draft.needs.indexOf('lieflat')
  if (v.lieFlat && i < 0) draft.needs.push('lieflat')
  if (!v.lieFlat && i >= 0) draft.needs.splice(i, 1)
}

/* 长途票务 */
const ticketType = ref('train')
const seatClass = ref('二等座')
const ticketOptions = [
  { value: 'train', label: '高铁 / 火车', desc: '限普速硬卧或高铁二等座' },
  { value: 'flight', label: '飞机', desc: '限国内民航经济舱' }
]
const seatOptions = computed(() => ticketType.value === 'train'
  ? [{ value: '二等座', label: '高铁二等座', desc: '按实际票面' }, { value: '硬卧', label: '普速硬卧', desc: '按实际票面' }]
  : [{ value: '经济舱', label: '经济舱', desc: '按实际票面' }])
const ticketSheet = ref(false)
const seatSheet = ref(false)

function goNext() {
  router.push('/book/materials')
}
</script>

<template>
  <div>
    <NavBar title="方案确认" back="/book" />
    <div class="page with-bar">
      <ProgressDots :total="4" :current="2" :labels="['预约信息', '车型确认', '材料上传', '提交']" />

      <!-- 里程结论 -->
      <section class="dist-card">
        <div class="dc-head">
          <span class="dc-tag" :class="{ long: isLong }">{{ isLong ? '长途' : '短途' }}</span>
          <span class="tiny muted">单程测算里程</span>
        </div>
        <div class="dc-km"><span class="num">{{ draft.distanceKm }}</span><span class="unit">公里</span></div>
        <div class="dc-route">
          <span>{{ hospital?.city }}{{ hospital?.district }}</span>
          <Icon name="arrowRight" :size="14" />
          <span>{{ address?.city }}{{ address?.district }}</span>
        </div>
        <p class="tiny muted dc-note">
          以最短实际行驶路线测算，接近 {{ LONG_TRIP_KM }} 公里分界时以最终测算为准。200 公里以内为短途用车，超过为长途票务方案。
        </p>
      </section>

      <!-- 软提示 -->
      <div v-if="warnings.length" class="warn-block">
        <div v-for="w in warnings" :key="w.code" class="alert" :class="w.level === 'warn' ? 'warn' : 'info'">
          <Icon :name="w.level === 'warn' ? 'alert' : 'info'" :size="17" />
          <span><b style="font-weight:600">{{ w.title }}</b><br />{{ w.text }}</span>
        </div>
      </div>

      <!-- 短途：车型 -->
      <template v-if="!isLong">
        <div class="section-title"><span class="t">用车方案</span><span class="s">根据身体条件与人数推荐</span></div>
        <div class="card">
          <button class="field" style="border-bottom:0" @click="vehicleOpen = true">
            <span class="label">车型</span>
            <span class="value">{{ vehicleLabel }}</span>
            <Icon class="chev" name="chevron" :size="17" />
          </button>

          <div class="veh-visual">
            <div class="veh-icon"><Icon :name="draft.lieFlatRequired ? 'hospital' : 'car'" :size="34" /></div>
            <div class="veh-points">
              <div class="vp"><Icon name="check" :size="14" /> 五座 / 七座 / 平躺车按需适配</div>
              <div class="vp"><Icon name="check" :size="14" /> 司机持证上岗，车辆合规备案</div>
              <div class="vp"><Icon name="check" :size="14" /> 医院到家庭常住地单次直达</div>
              <div class="vp" v-if="draft.lieFlatRequired"><Icon name="check" :size="14" /> 平躺车配备固定担架与安全带</div>
            </div>
          </div>

          <div v-if="draft.lieFlatRequired" class="alert warn" style="margin-top:4px">
            <Icon name="alert" :size="16" />
            <span>已选择平躺需求，需上传主诊医生证明后才能提交，请在下一步上传。</span>
          </div>
        </div>

        <div v-if="draft.assistDischarge" class="card assist-card">
          <div class="ac-icon"><Icon name="user" :size="18" /></div>
          <div>
            <div class="h3">已包含协助出院</div>
            <p class="small muted" style="margin-top:3px">出院当天协助办理手续、病床转移至车辆，礼送上车</p>
          </div>
        </div>
      </template>

      <!-- 长途：票务 -->
      <template v-else>
        <div class="section-title"><span class="t">票务方案</span><span class="s">仅承担被保人及 1 名家属</span></div>
        <div class="card">
          <button class="field" @click="ticketSheet = true">
            <span class="label">交通方式</span>
            <span class="value">{{ ticketType === 'train' ? '高铁 / 火车' : '飞机' }}</span>
            <Icon class="chev" name="chevron" :size="17" />
          </button>
          <button class="field" @click="seatSheet = true">
            <span class="label">舱位 / 座席</span>
            <span class="value">{{ seatClass }}</span>
            <Icon class="chev" name="chevron" :size="17" />
          </button>
          <div class="field">
            <span class="label">票务人数</span>
            <span class="value">{{ draft.passengerCount }} 人<span class="hint">被保人 + {{ Math.max(0, draft.passengerCount - 1) }} 名家属</span></span>
          </div>
        </div>

        <div class="card ticket-card">
          <div class="tc-title"><Icon name="ticket" :size="17" /> 权益包含</div>
          <ul class="tc-list">
            <li>被保人及 1 名家属{{ ticketType === 'train' ? '返回家庭常住地所在城市的火车票' : '返回家庭常住地所在城市的机票' }}</li>
            <li>{{ ticketType === 'train' ? '限普速硬卧或高铁二等座' : '限国内民航经济舱' }}</li>
            <li>住院医院至同城火车站 / 机场的接送</li>
          </ul>
          <div class="tc-title" style="margin-top:14px"><Icon name="alert" :size="17" /> 不包含</div>
          <ul class="tc-list">
            <li>目的地火车站 / 机场至家庭常住地的交通</li>
            <li>超出 2 人的票款与接送</li>
            <li>自行安排交通的费用不予补贴或报销</li>
          </ul>
        </div>

        <p class="tiny muted" style="margin:10px 4px 0;line-height:1.7">
          超过 200 公里时不提供轿车或非急救转运车，如自行安排交通视为放弃服务。
        </p>
      </template>

      <!-- 权益说明 -->
      <div class="section-title"><span class="t">本次服务</span></div>
      <div class="card fee-card">
        <div class="fee-row"><span>服务费用</span><span class="fee-val">权益范围内</span></div>
        <div class="fee-row"><span>额外费用</span><span class="fee-val">无</span></div>
        <p class="tiny muted" style="margin:10px 0 0">超出服务范围的费用需自行承担，服务方不会在行程中收取额外费用。</p>
      </div>
    </div>

    <div class="action-bar">
      <button class="btn btn-primary" @click="goNext">下一步：上传材料</button>
    </div>

    <PickerSheet v-model:open="vehicleOpen" title="选择车型" :options="vehicleOptions" :model-value="draft.vehicleType"
                 :searchable="false" @update:model-value="pickVehicle" />
    <PickerSheet v-model:open="ticketSheet" title="选择交通方式" :options="ticketOptions" :model-value="ticketType"
                 :searchable="false" @update:model-value="v => (ticketType = v, seatClass = v === 'train' ? '二等座' : '经济舱')" />
    <PickerSheet v-model:open="seatSheet" title="选择座席" :options="seatOptions" :model-value="seatClass"
                 :searchable="false" @update:model-value="v => seatClass = v" />
  </div>
</template>

<style scoped>
.dist-card { margin-top: 18px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; }
.dc-head { display: flex; align-items: center; gap: 8px; }
.dc-tag { font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 5px; background: var(--brand-tint); color: var(--brand-deep); }
.dc-tag.long { background: #EDE7F4; color: #5B4380; }
.dc-km { display: flex; align-items: baseline; gap: 4px; margin: 8px 0 2px; }
.dc-km .num { font-family: var(--serif); font-size: 40px; font-weight: 700; line-height: 1; letter-spacing: -.01em; }
.dc-km .unit { font-size: 14px; color: var(--ink-3); }
.dc-route { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink-2); margin-top: 6px; }
.dc-note { margin: 12px 0 0; padding-top: 12px; border-top: 1px dashed var(--line); }

.warn-block { margin-top: 12px; }

.veh-visual { display: flex; gap: 14px; padding: 14px 0 4px; border-top: 1px dashed var(--line); margin-top: 8px; }
.veh-icon { width: 64px; height: 64px; border-radius: 14px; background: var(--brand-tint); color: var(--brand); display: grid; place-items: center; flex: none; }
.veh-points { display: grid; gap: 5px; align-content: center; }
.vp { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
.vp svg { color: var(--brand); flex: none; }

.assist-card { display: flex; gap: 12px; align-items: flex-start; }
.ac-icon { width: 34px; height: 34px; border-radius: 9px; background: #F1EEE7; color: var(--ink-2); display: grid; place-items: center; flex: none; }

.ticket-card .tc-title { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; }
.ticket-card .tc-title svg { color: var(--brand); }
.tc-list { margin: 8px 0 0; padding-left: 22px; font-size: 13px; color: var(--ink-2); line-height: 1.75; }

.fee-card { }
.fee-row { display: flex; justify-content: space-between; font-size: 14px; padding: 7px 0; }
.fee-val { font-weight: 600; color: var(--brand-deep); }
</style>
