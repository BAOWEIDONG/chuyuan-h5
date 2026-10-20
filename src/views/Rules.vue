<script setup>
import { computed, ref } from 'vue'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import PickerSheet from '../components/PickerSheet.vue'
import { PROVINCES } from '../data/cities.js'
import { isCityCovered } from '../data/cities.js'

const openFaq = ref(null)
const cityQuery = ref('')
const cityResult = ref(null)
const province = ref('')
const provinceOpen = ref(false)
const cityOpen = ref(false)

const provinceOptions = computed(() => PROVINCES.map(p => ({ value: p.name, label: p.name })))
const cityOptions = computed(() => {
  const p = PROVINCES.find(x => x.name === province.value)
  return (p?.cities || []).map(c => ({ value: c, label: c }))
})

function checkCity(c) {
  cityResult.value = { city: c, ok: isCityCovered(c) }
}

const FAQ = [
  { q: '申请后自行安排交通，可以补贴或报销吗？', a: '无论任何形式，自行安排交通均视为放弃服务，不提供补贴或报销。' },
  { q: '出院以后还能申请吗？', a: '不能。须在出院前 24 小时提交申请。临近出院临时申请会尽力协调，但无法保证。已出院后再申请不予受理。' },
  { q: '超过 200 公里可以安排轿车吗？', a: '不可以。超过 200 公里仅承担被保人及 1 名家属的火车票（普速硬卧 / 高铁二等座）或机票（经济舱），并提供医院到同城火车站 / 机场的接送。' },
  { q: '可以用于转院吗？', a: '不可以。转院属于医疗转运，不在本服务范围。' },
  { q: '家庭常住地可以有几个？', a: '有且只有 1 个。首次服务时正式登记，后续默认使用该地址，不支持修改。临租房、酒店、探亲住所、康复机构等均不适用。' },
  { q: '服务使用时间有什么要求？', a: '仅限出院当天及之后 2 个自然日内使用。例：1 月 17 日出院，可安排 1 月 17、18、19 日，1 月 20 日及以后不予受理。' },
  { q: '需要输液、吸氧可以安排吗？', a: '不可以。需输液、吸氧、心电监护等医疗支持的情况不适用本服务，建议联系医院安排救护车。' },
  { q: '可以变更预约的时间吗？', a: '可以。须在约定时间前 4 个工作小时通知服务商（服务时间 9:00–21:00）。未提前变更时，服务方会尽力协调，但客观无法安排时不承担责任。' }
]
</script>

<template>
  <div>
    <NavBar title="服务规则" back="/" />
    <div class="page rules">
      <section class="intro">
        <h1 class="h1">出院交通安排</h1>
        <p class="intro-p">被保险人因意外或疾病住院，出院时从本次住院医院返回家庭常住地的交通接送。</p>
        <div class="intro-tags">
          <span>非医疗类</span><span>非急救类</span><span>普通交通接送</span>
        </div>
      </section>

      <div class="section-title"><span class="t">关键规则</span></div>
      <div class="card rules-card">
        <div class="rl"><span class="rn">01</span><div><b>申请时间</b><p>出院前 24 小时提交，仅限出院当天及之后 2 个自然日内使用</p></div></div>
        <div class="rl"><span class="rn">02</span><div><b>使用次数</b><p>保单有效期内，同一次住院仅提供 1 次</p></div></div>
        <div class="rl"><span class="rn">03</span><div><b>服务范围</b><p>全国 331 个城市市辖区内的二级及以上公立医院</p></div></div>
        <div class="rl"><span class="rn">04</span><div><b>起止点</b><p>本次住院医院 → 已登记的家庭常住地，单次直达</p></div></div>
        <div class="rl"><span class="rn">05</span><div><b>服务时间</b><p>工作日 9:00–21:00，节假日顺延</p></div></div>
        <div class="rl"><span class="rn">06</span><div><b>响应时效</b><p>材料齐全后 12 个工作小时内响应，24 个工作小时内确认</p></div></div>
      </div>

      <div class="section-title"><span class="t">服务内容</span></div>
      <div class="card">
        <div class="sv">
          <div class="sv-h"><Icon name="car" :size="17" /> 短途 · 200 公里以内</div>
          <p>按身体条件提供五座轿车或七座商务车。需平躺的，凭主诊医生证明可安排平躺车或非急救转运车。</p>
        </div>
        <div class="divider" />
        <div class="sv">
          <div class="sv-h"><Icon name="train" :size="17" /> 长途 · 超过 200 公里</div>
          <p>承担被保人及 1 名家属返回家庭常住地的火车票（普速硬卧 / 高铁二等座）或机票（经济舱），并提供医院到同城火车站 / 机场的接送。不含目的地站场到家的交通。</p>
        </div>
        <div class="divider" />
        <div class="sv">
          <div class="sv-h"><Icon name="user" :size="17" /> 协助出院</div>
          <p>出院当天协助办理出院手续，协助从病床转移至车辆，礼送上车。</p>
        </div>
      </div>

      <div class="section-title"><span class="t">不适用情形</span></div>
      <div class="card no-card">
        <p>转院、跨院就医、医疗转运、康复机构接送、异地返程、探亲旅游疗养等非出院场景；当日出入院；需输液、吸氧、心电监护等医疗支持；病情危重或主动放弃治疗；非二级及以上公立医院；非 331 城市市辖区。</p>
      </div>

      <div class="section-title"><span class="t">城市覆盖查询</span></div>
      <div class="card">
        <div class="city-search">
          <button class="field" style="border-bottom:0;padding-top:6px" @click="provinceOpen = true">
            <span class="label">省份</span>
            <span class="value" :class="{ placeholder: !province }">{{ province || '选择省份' }}</span>
            <Icon class="chev" name="chevron" :size="17" />
          </button>
          <button class="field" style="border-bottom:0" @click="province && (cityOpen = true)">
            <span class="label">城市</span>
            <span class="value" :class="{ placeholder: !cityQuery }">{{ cityQuery || '选择城市' }}</span>
            <Icon class="chev" name="chevron" :size="17" />
          </button>
        </div>
        <div v-if="cityResult" class="city-result" :class="cityResult.ok ? 'ok' : 'no'">
          <Icon :name="cityResult.ok ? 'check' : 'close'" :size="16" />
          <span v-if="cityResult.ok">{{ cityResult.city }} 已开通，服务范围为其市辖区</span>
          <span v-else>{{ cityResult.city }} 暂未开通，可拨打 400-820-8866 查询最新服务城市</span>
        </div>
        <p class="tiny muted" style="margin:10px 0 0">服务覆盖市辖区，不含下辖县、县级市（江苏、浙江、重庆部分区域除外）；不含港澳台及境外。</p>
      </div>

      <div class="section-title"><span class="t">常见问题</span></div>
      <div class="card faq">
        <button v-for="(f, i) in FAQ" :key="i" class="faq-item" :class="{ open: openFaq === i }" @click="openFaq = openFaq === i ? null : i">
          <div class="fq">
            <span>{{ f.q }}</span>
            <Icon name="chevron" :size="16" class="fq-chev" />
          </div>
          <p v-if="openFaq === i" class="fa">{{ f.a }}</p>
        </button>
      </div>

      <div class="contact">
        <div class="c-t">还有其他问题</div>
        <a class="c-btn" href="tel:4008208866"><Icon name="phone" :size="15" /> 客服热线 400-820-8866</a>
        <p class="tiny muted" style="margin-top:8px">工作日 9:00–21:00</p>
      </div>
    </div>

    <PickerSheet v-model:open="provinceOpen" title="选择省份" :options="provinceOptions" :model-value="province"
                 :searchable="false" @update:model-value="v => { province = v; cityQuery = ''; cityResult = null }" />
    <PickerSheet v-model:open="cityOpen" title="选择城市" :options="cityOptions" :model-value="cityQuery"
                 search-placeholder="搜索城市" @update:model-value="v => { cityQuery = v; checkCity(v) }" />
  </div>
</template>

<style scoped>
.rules { padding-top: 6px; }
.intro { padding: 16px 2px 4px; }
.intro-p { font-size: 13.5px; color: var(--ink-2); margin: 10px 0 0; line-height: 1.75; }
.intro-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.intro-tags span { font-size: 11px; color: var(--brand-ink); background: var(--brand-tint); padding: 4px 10px; border-radius: 8px; font-weight: 600; }
.rules-card { padding: 4px 16px; }
.rl { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.rl:last-child { border-bottom: 0; }
.rn {
  width: 22px; height: 22px; border-radius: 8px; flex: none; margin-top: 1px;
  font-size: 11px; font-weight: 700; color: var(--brand-ink); background: var(--brand-tint);
  display: grid; place-items: center;
}
.rl b { font-size: 13.5px; font-weight: 700; }
.rl p { font-size: 12.5px; color: var(--ink-2); margin: 4px 0 0; line-height: 1.65; }
.sv-h { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; }
.sv-h svg { color: var(--green); }
.sv p { font-size: 12.5px; color: var(--ink-2); line-height: 1.75; margin: 7px 0 0; }
.no-card p { font-size: 12.5px; color: var(--ink-2); line-height: 1.85; margin: 0; }
.city-result { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 11px 13px; border-radius: 12px; font-size: 12.5px; font-weight: 500; }
.city-result.ok { background: var(--green-tint); color: var(--green-deep); }
.city-result.no { background: var(--red-tint); color: #B3311F; }
.faq { padding: 2px 16px; }
.faq-item { display: block; width: 100%; text-align: left; padding: 14px 0; border-bottom: 1px solid var(--line); }
.faq-item:last-child { border-bottom: 0; }
.fq { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13.5px; line-height: 1.55; font-weight: 500; }
.fq-chev { color: rgba(60, 60, 67, .26); flex: none; transition: transform .18s; }
.faq-item.open .fq-chev { transform: rotate(90deg); color: var(--brand); }
.fa { font-size: 12.5px; color: var(--ink-2); line-height: 1.8; margin: 9px 0 0; }
.contact { text-align: center; margin-top: 26px; padding: 18px 0 8px; }
.c-t { font-size: 13px; color: var(--ink-2); }
.c-btn {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 11px; padding: 10px 20px; border-radius: 20px;
  background: var(--grad); color: #fff; font-size: 13.5px; font-weight: 600; box-shadow: 0 8px 18px rgba(255, 90, 0, .24);
}
</style>
