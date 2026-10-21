<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import CallLink from '../components/CallLink.vue'
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
          <span>地址已锁定。如需变更，请拨打 <CallLink inline bare :icon="false" /> 并重新提供住址证明。</span>
        </div>
      </div>

      <div v-else class="card empty-card">
        <span class="ec-ic"><Icon name="pin" :size="24" /></span>
        <div class="ec-t">尚未登记家庭常住地</div>
        <div class="ec-d">首次预约时需要登记家庭常住地，登记后不可修改。后续申请将默认使用该地址。</div>
        <ul class="ec-pts">
          <li><Icon name="check" :size="13" /> 支持按省市区逐级选择</li>
          <li><Icon name="check" :size="13" /> 需上传一份住址证明材料</li>
        </ul>
        <button class="btn btn-primary" style="margin-top:16px" @click="open = true">登记地址</button>
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
.addr-card {
  position: relative; margin-top: 16px; padding: 18px;
  background: var(--card); backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
  border: 1px solid rgba(255, 255, 255, .96); border-radius: 24px; box-shadow: var(--shadow);
}
.ac-top { display: flex; justify-content: space-between; align-items: center; }
.ac-badge { font-size: 11.5px; color: #fff; background: var(--grad); padding: 3px 10px; border-radius: 9px; font-weight: 700; }
.ac-addr { font-size: 20px; font-weight: 800; margin-top: 14px; line-height: 1.4; letter-spacing: .1px; }
.ac-detail { font-size: 14px; color: var(--ink-2); margin-top: 4px; }
.ac-proof { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-3); margin-top: 15px; padding-top: 13px; border-top: 1px solid var(--line); }
.ac-lock {
  display: flex; gap: 7px; font-size: 11.5px; color: var(--ink-2); margin-top: 12px; line-height: 1.6;
  background: var(--fill); padding: 11px 12px; border-radius: 12px;
}
.ac-lock svg { flex: none; margin-top: 1px; color: var(--ink-3); }
.empty-card { margin-top: 16px; padding: 22px 18px 18px; text-align: center; }
.ec-ic {
  width: 56px; height: 56px; border-radius: 18px; margin: 0 auto 14px; display: grid; place-items: center;
  background: var(--brand-tint); color: var(--brand); border: 1px solid var(--brand-line);
}
.ec-t { font-size: 17px; font-weight: 800; }
.ec-d { font-size: 12.5px; color: var(--ink-3); line-height: 1.6; margin-top: 7px; }
.ec-pts { list-style: none; margin: 16px 0 0; padding: 14px 14px; text-align: left; background: var(--fill); border-radius: 14px; display: flex; flex-direction: column; gap: 8px; }
.ec-pts li { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--ink-2); }
.ec-pts svg { color: var(--green); flex: none; }
.no-list { padding: 4px 16px; }
.nl { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--ink-2); padding: 10px 0; border-bottom: 1px solid var(--line); }
.nl:last-child { border-bottom: 0; }
.nl svg { color: var(--red); flex: none; }
</style>
