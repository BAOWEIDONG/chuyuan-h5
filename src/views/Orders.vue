<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import { store } from '../store/orders.js'
import { STATUS_META, CLOSE_REASON } from '../rules/status.js'
import { formatDateTime } from '../rules/time.js'
import { RATING_TEXT } from '../rules/review.js'

const router = useRouter()
const tab = ref('all')

const TABS = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'done', label: '已结束' }
]

const list = computed(() => {
  const all = store.orders
  if (tab.value === 'active') return all.filter(o => !['COMPLETED', 'CLOSED'].includes(o.status))
  if (tab.value === 'done') return all.filter(o => ['COMPLETED', 'CLOSED'].includes(o.status))
  return all
})

function label(o) {
  if (o.status === 'CLOSED') return CLOSE_REASON[o.closeReason] || '已结束'
  return STATUS_META[o.status]?.label || ''
}
// 已结束订单补一句原因，避免列表里只有状态标签看不出为什么
function closeNote(o) {
  if (o.closeReason === 'REJECTED') return o.rejectReason || '不符合服务条件'
  if (o.closeReason === 'CANCELLED') return o.cancelReason ? `取消原因：${o.cancelReason}` : '客户主动取消'
  return o.closeReason ? `结束原因：${CLOSE_REASON[o.closeReason]}` : ''
}
// 进行中的下一步：让列表本身就能看出走到哪儿了
function nextStep(o) {
  switch (o.status) {
    case 'REVIEWING': return '材料核验中，通过后进入派单'
    case 'NEED_INFO': return '有材料需重新上传'
    case 'DISPATCHING': return '正在匹配属地服务商'
    case 'CONFIRMED': return `${o.travelDate} ${o.travelTime} 出行，服务商将提前联系`
    case 'ON_THE_WAY': return '车辆正在前往医院'
    case 'IN_SERVICE': return '行程进行中，即将送达'
    default: return ''
  }
}
function tone(o) {
  if (o.status === 'CLOSED') return o.closeReason === 'REJECTED' ? 'danger' : 'muted'
  return STATUS_META[o.status]?.tone || 'muted'
}
</script>

<template>
  <div>
    <NavBar title="服务记录" back="/" />
    <div class="tabs">
      <button v-for="t in TABS" :key="t.value" class="tab" :class="{ on: tab === t.value }" @click="tab = t.value">
        {{ t.label }}
        <span v-if="t.value === 'all' && store.orders.length" class="cnt num">{{ store.orders.length }}</span>
      </button>
    </div>

    <div class="page">
      <div v-if="!list.length" class="card empty-card">
        <span class="ec-ic"><Icon name="list" :size="24" /></span>
        <div class="ec-t">还没有服务记录</div>
        <div class="ec-d">预约成功后可在这里查看审核、派单与行程进度。</div>
        <button class="btn btn-primary" style="margin-top:18px" @click="router.push('/eligibility')">去预约</button>
      </div>

      <div v-for="o in list" :key="o.id" class="card ord" @click="router.push('/order/' + o.id)">
        <div class="ord-top">
          <span class="badge" :class="tone(o)">{{ label(o) }}</span>
          <span class="tiny muted num">{{ formatDateTime(o.createdAt) }}</span>
        </div>
        <div class="ord-route">
          <div class="or-h">{{ o.hospital.name }}</div>
          <div class="or-a"><Icon name="arrowRight" :size="12" /> {{ o.address.city }}{{ o.address.district }}{{ o.address.community }}</div>
        </div>
        <div class="ord-foot">
          <span class="num">{{ o.id }}</span>
          <span>{{ o.travelDate }} {{ o.travelTime }}</span>
        </div>
        <div v-if="!['COMPLETED', 'CLOSED'].includes(o.status)" class="ord-live">
          <span class="lv-dot" />
          <span class="lv-t">{{ nextStep(o) }}</span>
          <span class="lv-go">查看进度<Icon name="chevron" :size="12" /></span>
        </div>
        <div v-if="o.status === 'COMPLETED'" class="ord-rate">
          <template v-if="o.evaluation && !o.evaluation.skipped">
            <span class="stars">
              <Icon v-for="n in 5" :key="n" name="star" :size="13" :fill="n <= o.evaluation.rating"
                :style="{ color: n <= o.evaluation.rating ? '#FF8A1F' : 'rgba(60,60,67,.22)' }" />
            </span>
            <span class="rate-txt">{{ RATING_TEXT[o.evaluation.rating] }} · 已评价</span>
            <span class="rate-act">查看</span>
          </template>
          <template v-else>
            <span class="rate-txt muted">{{ o.evaluation ? '已跳过评价' : '已完成，待评价' }}</span>
            <button v-if="!o.evaluation" class="rate-btn" @click.stop="router.push('/order/' + o.id + '/review')">去评价</button>
          </template>
        </div>
        <div v-else class="ord-close">
          <span>{{ closeNote(o) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex; gap: 8px; padding: 10px 16px; position: sticky; top: 56px; z-index: 20;
  background: rgba(250, 250, 252, .78); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
}
.tab {
  padding: 7px 15px; border-radius: 16px; font-size: 13.5px; color: var(--ink-2); font-weight: 500;
  display: flex; align-items: center; gap: 5px; background: rgba(255, 255, 255, .72);
  border: 1px solid rgba(60, 60, 67, .07); transition: all .15s;
}
.tab.on { background: var(--grad); color: #fff; border-color: transparent; font-weight: 700; box-shadow: 0 6px 14px rgba(255, 90, 0, .22); }
.cnt { font-size: 10.5px; background: var(--fill-2); color: var(--ink-2); padding: 1px 6px; border-radius: 8px; font-weight: 600; }
.tab.on .cnt { background: rgba(255, 255, 255, .26); color: #fff; }
.ord { margin-top: 12px; }
.ord-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.ord-route { margin-top: 13px; }
.or-h { font-size: 15px; font-weight: 600; line-height: 1.4; }
.or-a { display: flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--ink-3); margin-top: 6px; }
.ord-foot { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ink-3); margin-top: 14px; padding-top: 11px; border-top: 1px solid var(--line); }
.ord-live { display: flex; align-items: center; gap: 7px; margin-top: 11px; padding: 9px 11px; border-radius: 12px; background: var(--brand-tint); font-size: 12px; color: var(--brand-ink); line-height: 1.45; }
.lv-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--brand); box-shadow: 0 0 0 3px rgba(255, 122, 31, .16); }
.lv-t { flex: 1; min-width: 0; }
.lv-go { display: inline-flex; align-items: center; gap: 1px; flex: none; font-weight: 600; }
.ord-close { margin-top: 11px; padding-top: 11px; border-top: 1px dashed rgba(60, 60, 67, .12); font-size: 12px; color: var(--ink-3); line-height: 1.6; }
.ord-rate { display: flex; align-items: center; gap: 7px; margin-top: 11px; padding-top: 11px; border-top: 1px dashed rgba(60, 60, 67, .12); }
.stars { display: inline-flex; gap: 1px; }
.rate-txt { font-size: 12px; color: var(--ink-2); }
.rate-txt.muted { color: var(--ink-3); }
.rate-act { margin-left: auto; font-size: 11.5px; color: var(--ink-3); }
.rate-btn {
  margin-left: auto; font-size: 12px; color: #fff;
  background: var(--grad); padding: 6px 14px; border-radius: 14px; font-weight: 600;
  box-shadow: 0 5px 12px rgba(255, 90, 0, .24);
}
.empty-card { margin-top: 16px; padding: 30px 20px 22px; text-align: center; }
.ec-ic { width: 56px; height: 56px; border-radius: 18px; margin: 0 auto 14px; display: grid; place-items: center; background: var(--brand-tint); color: var(--brand); border: 1px solid var(--brand-line); }
.ec-t { font-size: 17px; font-weight: 800; }
.ec-d { font-size: 12.5px; color: var(--ink-3); line-height: 1.65; margin-top: 8px; }
</style>
