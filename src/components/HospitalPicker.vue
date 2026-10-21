<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import CallLink from './CallLink.vue'
import PickerSheet from './PickerSheet.vue'
import { PROVINCES, ALL_CITIES } from '../data/cities.js'
import { HOSPITALS } from '../data/hospitals.js'
import { checkHospital } from '../rules/eligibility.js'

const props = defineProps({
  open: Boolean,
  modelValue: { type: Object, default: null } // {id,name,city,district,level,nature}
})
const emit = defineEmits(['update:open', 'select'])

const step = ref('city') // city | hospital
const province = ref('')
const city = ref('')
const keyword = ref('')
const provinceSheet = ref(false)
const citySheet = ref(false)

watch(() => props.open, (v) => {
  if (v) {
    step.value = 'city'
    keyword.value = ''
    province.value = ''
    city.value = ''
  }
})

const provinceOptions = computed(() => PROVINCES.map(p => ({ value: p.name, label: p.name })))
const cityOptions = computed(() => {
  const p = PROVINCES.find(x => x.name === province.value)
  return (p?.cities || []).map(c => ({ value: c, label: c }))
})

const hotCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉']

const hospitalList = computed(() => {
  const k = keyword.value.trim()
  let list = HOSPITALS.filter(h => h.city === city.value)
  if (k) list = HOSPITALS.filter(h => h.city === city.value && (h.name.includes(k) || h.district.includes(k)))
  // 合规的排前面，不合规的置灰但保留（让客户看到为什么不行）
  return list.map(h => {
    const err = checkHospital(h)
    return { ...h, err }
  }).sort((a, b) => (a.err ? 1 : 0) - (b.err ? 1 : 0))
})

function pickProvince(v) { province.value = v; city.value = ''; provinceSheet.value = false; citySheet.value = true }
function pickCity(v) {
  city.value = v
  citySheet.value = false
  step.value = 'hospital'
  keyword.value = ''
}
function choose(h) {
  if (h.err) return
  emit('select', h)
  emit('update:open', false)
}
function quickCity(c) {
  const p = ALL_CITIES.find(x => x.city === c)
  if (p) { province.value = p.province; city.value = c; step.value = 'hospital' }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="mask" @click.self="emit('update:open', false)">
        <div class="sheet" role="dialog" aria-label="选择就诊医院">
          <div class="sheet-head">
            <button v-if="step === 'hospital'" class="close" style="margin-left:0;margin-right:6px" aria-label="返回" @click="step = 'city'">
              <Icon name="back" :size="18" />
            </button>
            <span class="t">{{ step === 'city' ? '选择就诊医院所在城市' : city + ' · 选择医院' }}</span>
            <button class="close" aria-label="关闭" @click="emit('update:open', false)"><Icon name="close" :size="18" /></button>
          </div>

          <div v-if="step === 'city'" class="sheet-body">
            <div class="hot">
              <span class="small muted">常用</span>
              <div class="chip-row" style="margin-top:8px">
                <button v-for="c in hotCities" :key="c" class="chip" @click="quickCity(c)">{{ c }}</button>
              </div>
            </div>
            <div class="divider" />
            <button class="field" @click="provinceSheet = true">
              <span class="label">省份</span>
              <span class="value" :class="{ placeholder: !province }">{{ province || '请选择省 / 直辖市' }}</span>
              <Icon class="chev" name="chevron" :size="17" />
            </button>
            <button class="field" :class="{ 'value-disabled': !province }" @click="province && (citySheet = true)">
              <span class="label">城市</span>
              <span class="value" :class="{ placeholder: !city }">{{ city || '请选择城市' }}</span>
              <Icon class="chev" name="chevron" :size="17" />
            </button>
            <p class="tiny muted" style="margin-top:14px">
              服务范围覆盖全国 331 个城市的市辖区，不含下辖县、县级市及港澳台地区。
            </p>
          </div>

          <div v-else class="sheet-body">
            <label class="search" style="margin-bottom:6px">
              <Icon name="search" :size="17" />
              <input v-model="keyword" placeholder="搜索医院名称或所在区" />
              <button v-if="keyword" aria-label="清空" @click="keyword = ''"><Icon name="close" :size="15" /></button>
            </label>
            <div v-if="!hospitalList.length" class="empty">
              <div class="t">该城市暂未收录医院</div>
              <div class="small">可返回选择其他城市，或拨打 <CallLink inline bare :icon="false" /> 咨询</div>
            </div>
            <button v-for="h in hospitalList" :key="h.id" class="opt"
                    :class="{ disabled: !!h.err }" :disabled="!!h.err" @click="choose(h)">
              <span class="main">
                <span class="l">{{ h.name }}</span>
                <span class="d">{{ h.district }} · {{ h.level }} · {{ h.nature }}</span>
                <span v-if="h.err" class="d" style="color:var(--seal)">{{ h.err.text }}</span>
              </span>
              <Icon v-if="!h.err" class="chev" name="chevron" :size="17" />
              <span v-else class="badge danger">不适用</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <PickerSheet v-model:open="provinceSheet" title="选择省份" :options="provinceOptions"
                 :model-value="province" :searchable="false" @update:model-value="pickProvince" />
    <PickerSheet v-model:open="citySheet" title="选择城市" :options="cityOptions"
                 :model-value="city" search-placeholder="搜索城市" @update:model-value="pickCity" />
  </Teleport>
</template>

<style scoped>
.hot { padding-top: 4px; }
.value-disabled { opacity: .5; }
</style>
