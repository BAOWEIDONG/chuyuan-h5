<script setup>
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import PickerSheet from './PickerSheet.vue'
import { PROVINCE_CITIES, districtsOf } from '../data/regions.js'
import { PROVINCES } from '../data/cities.js'

const props = defineProps({
  open: Boolean,
  modelValue: { type: Object, default: null },
  title: { type: String, default: '登记家庭常住地' }
})
const emit = defineEmits(['update:open', 'save'])

const province = ref('')
const city = ref('')
const district = ref('')
const detail = ref('')
const community = ref('')
const proofType = ref('')
const pSheet = ref(false)
const cSheet = ref(false)
const dSheet = ref(false)
const proofSheet = ref(false)
const sCommunity = ref(false)
const err = ref('')

// 服务覆盖的 331 个城市，地址选到城市即可，避免用户在长列表里翻找
// 城市按省份分组平铺，支持搜索，减少逐级点击
const cityOptionsAll = computed(() =>
  PROVINCES.flatMap(p => p.cities.map(c => ({ value: c, label: c, group: p.name })))
)

const PROOFS = [
  { value: 'idcard', label: '身份证', desc: '住址与身份证一致时可用' },
  { value: 'hukou', label: '户口簿', desc: '户籍所在地' },
  { value: 'house', label: '房产证 / 购房合同', desc: '本人或配偶名下' },
  { value: 'residence', label: '居住证', desc: '连续居住满 12 个月' },
  { value: 'social', label: '社保缴纳证明', desc: '连续缴纳满 12 个月' },
  { value: 'lease', label: '备案租赁合同', desc: '需列明居住日期并盖章' }
]

// 小区名称也是选择，避免手打错别字导致派单地址不一致
const communities = [
  '万科城', '碧桂园凤凰城', '保利花园', '恒大绿洲', '华润中心', '绿地世纪城',
  '中海国际社区', '龙湖春江郦城', '金地格林小镇', '融创壹号院', '富力城', '其他（手动填写）'
]

watch(() => props.open, (v) => {
  if (v) {
    err.value = ''
    const m = props.modelValue
    province.value = m?.province || ''
    city.value = m?.city || ''
    district.value = m?.district || ''
    detail.value = m?.detail || ''
    community.value = m?.community || ''
    proofType.value = m?.proofType || ''
  }
})

const provinceOptions = computed(() => Object.keys(PROVINCE_CITIES).map(p => ({ value: p, label: p })))
const districtOptions = computed(() => districtsOf(city.value).map(d => ({ value: d, label: d })))
const proofOptions = computed(() => PROOFS.map(p => ({ value: p.value, label: p.label, desc: p.desc })))

function pickProvince(v) { province.value = v; city.value = ''; district.value = ''; pSheet.value = false }
function pickCity(v) {
  city.value = v
  const hit = PROVINCES.find(p => p.cities.includes(v))
  if (hit) province.value = hit.name
  district.value = ''
  cSheet.value = false
  dSheet.value = true
}
function pickDistrict(v) { district.value = v; dSheet.value = false }

function save() {
  if (!province.value || !city.value || !district.value) {
    err.value = '请完整选择省、市、区'
    return
  }
  if (!community.value) {
    err.value = '请选择小区'
    return
  }
  if (community.value === '其他（手动填写）' && !detail.value.trim()) {
    err.value = '请填写小区或楼栋名称'
    return
  }
  if (!proofType.value) {
    err.value = '请选择住址证明材料类型'
    return
  }
  emit('save', {
    province: province.value,
    city: city.value,
    district: district.value,
    community: community.value,
    detail: detail.value.trim(),
    proofType: proofType.value,
    label: proofLabel(proofType.value)
  })
  emit('update:open', false)
}

function proofLabel(v) {
  return PROOFS.find(p => p.value === v)?.label || ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="mask" @click.self="emit('update:open', false)">
        <div class="sheet" role="dialog" aria-label="家庭常住地">
          <div class="sheet-head">
            <span class="t">{{ title }}</span>
            <button class="close" aria-label="关闭" @click="emit('update:open', false)"><Icon name="close" :size="18" /></button>
          </div>
          <div class="sheet-body">
            <div class="alert warn" style="margin-bottom:8px">
              <Icon name="alert" :size="17" />
              <span>家庭常住地仅登记一次，登记后不可修改。后续申请默认使用该地址，请确认无误。</span>
            </div>

            <button class="field" @click="cSheet = true">
              <span class="label">所在城市</span>
              <span class="value" :class="{ placeholder: !city }">
                {{ city || '搜索或选择城市' }}
                <span v-if="province && city" class="hint">{{ province }}</span>
                <span v-else class="hint">按省份分组，可直接搜索</span>
              </span>
              <Icon class="chev" name="chevron" :size="17" />
            </button>
            <button class="field" @click="cSheet = true">
              <span class="label">城市</span>
              <span class="value" :class="{ placeholder: !city }">{{ city || '请选择' }}</span>
              <Icon class="chev" name="chevron" :size="17" />
            </button>
            <button class="field" @click="city && (dSheet = true)">
              <span class="label">区 / 县</span>
              <span class="value" :class="{ placeholder: !district }">{{ district || '请选择' }}</span>
              <Icon class="chev" name="chevron" :size="17" />
            </button>
            <button class="field" @click="sCommunity = true">
              <span class="label">小区</span>
              <span class="value" :class="{ placeholder: !community }">{{ community || '请选择小区' }}</span>
              <Icon class="chev" name="chevron" :size="17" />
            </button>

            <label v-if="community === '其他（手动填写）'" class="field">
              <span class="label">小区名称</span>
              <input v-model="detail" class="value" style="border:0;outline:none;background:transparent" placeholder="填写小区或楼栋名称" />
            </label>

            <button class="field" @click="proofSheet = true">
              <span class="label">证明材料</span>
              <span class="value" :class="{ placeholder: !proofType }">{{ proofType ? proofLabel(proofType) : '请选择可提供的材料' }}</span>
              <Icon class="chev" name="chevron" :size="17" />
            </button>

            <p v-if="err" class="tiny" style="color:var(--seal);margin-top:10px">{{ err }}</p>
          </div>
          <div class="sheet-foot">
            <button class="btn btn-primary" @click="save">确认登记</button>
          </div>
        </div>
      </div>
    </Transition>

    <PickerSheet v-model:open="pSheet" title="选择省份" :options="provinceOptions" :model-value="province" :searchable="false" @update:model-value="pickProvince" />
    <PickerSheet v-model:open="cSheet" title="选择城市" :options="cityOptionsAll" :model-value="city" search-placeholder="搜索城市" @update:model-value="pickCity" />
    <PickerSheet v-model:open="dSheet" title="选择区县" :options="districtOptions" :model-value="district" :searchable="districtOptions.length > 8" search-placeholder="搜索区县" @update:model-value="pickDistrict" />
    <PickerSheet v-model:open="proofSheet" title="选择住址证明材料" :options="proofOptions" :model-value="proofType" :searchable="false" @update:model-value="v => proofType = v" />
    <PickerSheet v-model:open="sCommunity" title="选择小区" :options="communities.map(c => ({ value: c, label: c }))" :model-value="community" search-placeholder="搜索小区" @update:model-value="v => community = v" />
  </Teleport>
</template>
