<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import { store } from '../store/orders.js'
import { formatDateTime } from '../rules/time.js'

const router = useRouter()

function open(m) {
  store.markRead(m.id)
  if (m.orderId) router.push('/order/' + m.orderId)
}

const list = computed(() => store.messages)
</script>

<template>
  <div>
    <NavBar title="消息" back="/">
      <template #right>
        <button v-if="list.some(m => !m.read)" class="right" @click="store.markAllRead()">全部已读</button>
      </template>
    </NavBar>
    <div class="page">
      <div v-if="!list.length" class="card empty-card">
        <span class="ec-ic"><Icon name="bell" :size="24" /></span>
        <div class="ec-t">暂无消息</div>
        <div class="ec-d">预约提交后，审核结果、服务商确认、行前提醒都会在这里通知你。</div>
        <button class="btn btn-ghost" style="margin-top:18px" @click="router.push('/')">返回首页</button>
      </div>
      <button v-for="m in list" :key="m.id" class="msg" :class="{ unread: !m.read }" @click="open(m)">
        <span class="m-dot" />
        <span class="m-main">
          <span class="m-top">
            <span class="m-t">{{ m.title }}</span>
            <span class="m-time num">{{ formatDateTime(m.at) }}</span>
          </span>
          <span class="m-b">{{ m.body }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.msg {
  display: flex; gap: 10px; width: 100%; text-align: left; padding: 15px 15px; margin-top: 10px;
  border-radius: 18px; background: var(--card); border: 1px solid rgba(255, 255, 255, .95);
  box-shadow: var(--shadow-sm); align-items: flex-start;
}
.msg.unread { background: rgba(255, 248, 242, .96); border-color: rgba(255, 214, 184, .9); }
.m-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 7px; background: transparent; flex: none; }
.msg.unread .m-dot { background: var(--brand); box-shadow: 0 0 0 3px var(--brand-tint); }
.m-main { flex: 1; min-width: 0; }
.m-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
.m-t { font-size: 14.5px; color: var(--ink-2); font-weight: 500; }
.msg.unread .m-t { color: var(--ink); font-weight: 700; }
.m-time { font-size: 11px; color: var(--ink-3); flex: none; }
.empty-card { margin-top: 16px; padding: 30px 20px 22px; text-align: center; }
.ec-ic { width: 56px; height: 56px; border-radius: 18px; margin: 0 auto 14px; display: grid; place-items: center; background: var(--brand-tint); color: var(--brand); border: 1px solid var(--brand-line); }
.ec-t { font-size: 17px; font-weight: 800; }
.ec-d { font-size: 12.5px; color: var(--ink-3); line-height: 1.65; margin-top: 8px; }
.m-b { display: block; font-size: 12.5px; color: var(--ink-3); line-height: 1.6; margin-top: 5px; }
</style>
