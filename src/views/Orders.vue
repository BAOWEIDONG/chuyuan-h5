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
      <div v-if="!list.length" class="empty">
        <div class="t">还没有服务记录</div>
        <div class="small">预约成功后可在这里查看进度</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:16px;display:inline-flex" @click="router.push('/')">返回首页</button>
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
.tabs { display: flex; gap: 22px; padding: 4px 20px 0; border-bottom: 1px solid var(--line); background: var(--paper); position: sticky; top: 52px; z-index: 20; }
.tab { padding: 10px 0 12px; font-size: 14px; color: var(--ink-3); position: relative; display: flex; align-items: center; gap: 4px; }
.tab.on { color: var(--ink); font-weight: 600; }
.tab.on::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--brand); border-radius: 2px; }
.cnt { font-size: 11px; background: #E9E4D9; color: var(--ink-2); padding: 1px 5px; border-radius: 8px; }
.ord { margin-top: 12px; position: relative; }
.ord-top { display: flex; justify-content: space-between; align-items: center; }
.ord-route { margin-top: 12px; }
.or-h { font-size: 14.5px; font-weight: 500; line-height: 1.4; }
.or-a { display: flex; align-items: center; gap: 4px; font-size: 12.5px; color: var(--ink-3); margin-top: 5px; }
.ord-foot { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ink-3); margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line); }
.rate-btn { position: absolute; right: 16px; bottom: 14px; font-size: 12px; color: var(--brand-deep); background: var(--brand-tint); padding: 5px 11px; border-radius: 7px; font-weight: 500; }
</style>
