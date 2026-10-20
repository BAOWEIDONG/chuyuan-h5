<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import { store } from '../store/orders.js'

const route = useRoute()
const router = useRouter()
const order = computed(() => store.getOrder(route.params.id))

const rating = ref(0)
const tags = ref([])
const note = ref('')
const done = ref(false)

const TAGS = [
  { value: 'ontime', label: '准时到达' },
  { value: 'driver', label: '司机专业' },
  { value: 'clean', label: '车辆整洁' },
  { value: 'comm', label: '沟通顺畅' },
  { value: 'help', label: '上下车有帮手' },
  { value: 'quiet', label: '安静不打扰' }
]

const ratingText = computed(() => ['', '很不满意', '不满意', '一般', '满意', '非常满意'][rating.value])

function toggleTag(v) {
  const i = tags.value.indexOf(v)
  if (i >= 0) tags.value.splice(i, 1)
  else tags.value.push(v)
}

function submit(skip = false) {
  const o = order.value
  store.updateOrder(o.id, {
    evaluation: skip ? { skipped: true } : { rating: rating.value, tags: [...tags.value], note: note.value, at: new Date().toISOString() }
  })
  done.value = true
  setTimeout(() => router.replace('/order/' + o.id), 900)
}
</script>

<template>
  <div v-if="order">
    <NavBar title="服务评价" :back="'/order/' + order.id" />
    <div class="page">
      <div class="rv-head">
        <div class="rv-title">这次出院交通安排，体验如何？</div>
        <div class="rv-sub">{{ order.travelDate }} · {{ order.provider?.short }}</div>
      </div>

      <div class="stars">
        <button v-for="n in 5" :key="n" class="star-btn" :aria-label="`${n} 星`" @click="rating = n">
          <Icon name="star" :size="34" :style="{ color: n <= rating ? '#D9A03C' : '#DCD7CC' }" />
        </button>
      </div>
      <div class="rating-text">{{ ratingText }}</div>

      <div v-if="rating > 0" class="tag-block">
        <div class="tb-title small muted">哪些地方做得好</div>
        <div class="chip-row">
          <button v-for="t in TAGS" :key="t.value" class="chip" :class="{ on: tags.includes(t.value) }" @click="toggleTag(t.value)">{{ t.label }}</button>
        </div>
      </div>

      <div v-if="rating > 0" class="note-block">
        <textarea v-model="note" class="note" maxlength="200" placeholder="还有什么想告诉我们（选填）" rows="3" />
        <span class="count tiny muted num">{{ note.length }}/200</span>
      </div>

      <div class="rv-actions">
        <button class="btn btn-primary" :disabled="rating === 0" @click="submit(false)">
          {{ done ? '已提交' : '提交评价' }}
        </button>
        <button class="skip small muted" @click="submit(true)">暂不评价</button>
      </div>

      <div class="comp">
        <div class="comp-t small">服务有问题？</div>
        <div class="comp-d tiny muted">可拨打 95511-7 反馈，平台将在 1 个工作日内联系你。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rv-head { padding: 24px 4px 0; text-align: center; }
.rv-title { font-family: var(--serif); font-size: 21px; font-weight: 700; }
.rv-sub { font-size: 12.5px; color: var(--ink-3); margin-top: 6px; }
.stars { display: flex; justify-content: center; gap: 8px; margin-top: 26px; }
.star-btn { padding: 4px; }
.rating-text { text-align: center; font-size: 13px; color: var(--ink-2); height: 20px; margin-top: 8px; }
.tag-block { margin-top: 26px; }
.tb-title { margin-bottom: 10px; }
.note-block { margin-top: 20px; position: relative; }
.note { width: 100%; border: 1px solid var(--line); border-radius: 12px; background: var(--card); padding: 12px 14px 26px; font-size: 14px; line-height: 1.6; outline: none; resize: none; font-family: inherit; }
.note:focus { border-color: var(--brand); }
.count { position: absolute; right: 12px; bottom: 8px; }
.rv-actions { margin-top: 26px; display: grid; gap: 6px; }
.skip { padding: 10px; text-align: center; }
.comp { margin-top: 30px; text-align: center; padding: 14px; border-top: 1px solid var(--line); }
.comp-t { color: var(--ink-2); }
.comp-d { margin-top: 4px; line-height: 1.6; }
</style>
