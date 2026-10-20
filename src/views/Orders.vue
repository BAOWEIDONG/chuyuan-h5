<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import { store } from '../store/orders.js'
import { STATUS_META, CLOSE_REASON } from '../rules/status.js'
import { formatDateTime } from '../rules/time.js'

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
        <button v-if="o.status === 'COMPLETED' && !o.evaluation" class="rate-btn" @click.stop="router.push('/order/' + o.id + '/review')">去评价</button>
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
.ord { margin-top: 12px; position: relative; padding-right: 16px; }
.ord-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.ord-route { margin-top: 13px; }
.or-h { font-size: 15px; font-weight: 600; line-height: 1.4; }
.or-a { display: flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--ink-3); margin-top: 6px; }
.ord-foot { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ink-3); margin-top: 14px; padding-top: 11px; border-top: 1px solid var(--line); }
.rate-btn {
  position: absolute; right: 16px; bottom: 13px; font-size: 12px; color: #fff;
  background: var(--grad); padding: 6px 13px; border-radius: 14px; font-weight: 600;
  box-shadow: 0 5px 12px rgba(255, 90, 0, .24);
}
.empty-card { margin-top: 16px; padding: 30px 20px 22px; text-align: center; }
.ec-ic { width: 56px; height: 56px; border-radius: 18px; margin: 0 auto 14px; display: grid; place-items: center; background: var(--brand-tint); color: var(--brand); border: 1px solid var(--brand-line); }
.ec-t { font-size: 17px; font-weight: 800; }
.ec-d { font-size: 12.5px; color: var(--ink-3); line-height: 1.65; margin-top: 8px; }
</style>
