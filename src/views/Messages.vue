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
      <div v-if="!list.length" class="empty">
        <div class="t">暂无消息</div>
        <div class="small">申请受理、服务确认、行前提醒会在这里通知你</div>
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
.msg { display: flex; gap: 10px; width: 100%; text-align: left; padding: 16px 0; border-bottom: 1px solid var(--line); align-items: flex-start; }
.m-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 7px; background: transparent; flex: none; }
.msg.unread .m-dot { background: var(--seal); }
.m-main { flex: 1; min-width: 0; }
.m-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
.m-t { font-size: 14px; color: var(--ink-2); }
.msg.unread .m-t { color: var(--ink); font-weight: 600; }
.m-time { font-size: 11px; color: var(--ink-3); flex: none; }
.m-b { display: block; font-size: 12.5px; color: var(--ink-3); line-height: 1.55; margin-top: 4px; }
</style>
