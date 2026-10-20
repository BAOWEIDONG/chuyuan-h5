<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import AddressPicker from '../components/AddressPicker.vue'
import { store } from '../store/orders.js'
import { formatDateTime } from '../rules/time.js'

const router = useRouter()
const open = ref(false)
const saved = computed(() => store.address)

function save(a) {
  store.setAddress({ ...a, registeredAt: new Date().toISOString(), locked: true })
  store.pushMessage({ type: 'system', title: '家庭常住地已登记', body: `${a.province}${a.city}${a.district}${a.community}` })
}
</script>

<template>
  <div>
    <NavBar title="家庭常住地" back="/" />
    <div class="page">
      <div class="alert warn" style="margin-top:16px">
        <Icon name="alert" :size="17" />
        <span>同一被保险人的家庭常住地有且只有 1 个，首次登记后不可修改。后续申请默认使用该地址。</span>
      </div>

      <div v-if="saved" class="addr-card">
        <div class="ac-top">
          <span class="ac-badge">已登记</span>
          <span class="tiny muted">{{ formatDateTime(saved.registeredAt) }}</span>
        </div>
        <div class="ac-addr">{{ saved.province }}{{ saved.city }}{{ saved.district }}</div>
        <div class="ac-detail">{{ saved.community }}{{ saved.detail }}</div>
        <div class="ac-proof">
          <Icon name="doc" :size="14" />
          <span>证明类型：{{ saved.label }}</span>
        </div>
        <div class="ac-lock">
          <Icon name="shield" :size="14" />
          <span>地址已锁定。如需变更，请联系平台客服并重新提供住址证明。</span>
        </div>
      </div>

      <div v-else class="empty" style="padding-top:40px">
        <div class="t">尚未登记家庭常住地</div>
        <div class="small">首次预约时需要登记，登记后不可修改</div>
        <button class="btn btn-primary btn-sm" style="margin-top:18px;display:inline-flex" @click="open = true">登记地址</button>
      </div>

      <div class="section-title"><span class="t">哪些地址不能作为家庭常住地</span></div>
      <div class="card no-list">
        <div class="nl"><Icon name="close" :size="14" /><span>临时租房、酒店、民宿</span></div>
        <div class="nl"><Icon name="close" :size="14" /><span>出差、旅居、探亲住所</span></div>
        <div class="nl"><Icon name="close" :size="14" /><span>办公场所、疗养 / 医疗 / 康复护理机构</span></div>
        <div class="nl"><Icon name="close" :size="14" /><span>非户籍地且居住不满 12 个月的地址</span></div>
      </div>
      <p class="tiny muted" style="margin:14px 4px 0;line-height:1.7">
        家庭常住地指户籍所在地或连续居住 12 个月以上的经常居住地（住院治病除外）。证明材料包括身份证、户口簿、社保缴纳证明、房产证、购房合同、居住证等。
      </p>
    </div>

    <AddressPicker v-model:open="open" :model-value="saved" title="登记家庭常住地" @save="save" />
  </div>
</template>

<style scoped>
.addr-card { margin-top: 18px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px 16px; position: relative; }
.ac-top { display: flex; justify-content: space-between; align-items: center; }
.ac-badge { font-size: 11px; color: var(--brand-deep); background: var(--brand-tint); padding: 2px 8px; border-radius: 5px; font-weight: 600; }
.ac-addr { font-family: var(--serif); font-size: 19px; font-weight: 700; margin-top: 14px; line-height: 1.4; }
.ac-detail { font-size: 13.5px; color: var(--ink-2); margin-top: 4px; }
.ac-proof { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-3); margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--line); }
.ac-lock { display: flex; gap: 6px; font-size: 11.5px; color: var(--ink-3); margin-top: 10px; line-height: 1.55; background: #F4F1EA; padding: 10px 12px; border-radius: 8px; }
.ac-lock svg { flex: none; margin-top: 1px; }
.no-list { padding: 10px 16px; }
.nl { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); padding: 7px 0; }
.nl svg { color: var(--seal); flex: none; }
</style>
