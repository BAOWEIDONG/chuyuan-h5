<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  files: { type: Array, default: () => [] },
  title: String,
  desc: String,
  required: Boolean,
  max: { type: Number, default: 4 },
  samples: { type: Array, default: () => [] } // 演示用示例材料
})
const emit = defineEmits(['change'])
const inputEl = ref(null)
const busy = ref(false)
const err = ref('')

function pick() {
  if (props.files.length >= props.max) {
    err.value = `最多上传 ${props.max} 张`
    return
  }
  inputEl.value?.click()
}

function onChange(e) {
  const list = [...e.target.files]
  err.value = ''
  busy.value = true
  setTimeout(() => {
    const added = list.slice(0, props.max - props.files.length).map(f => ({
      name: f.name,
      size: Math.round(f.size / 1024),
      url: URL.createObjectURL(f)
    }))
    emit('change', [...props.files, ...added])
    busy.value = false
    e.target.value = ''
  }, 420)
}

function useSample(s) {
  emit('change', [...props.files, { name: s, size: 620, url: '', sample: true }])
}

function remove(i) {
  const next = [...props.files]
  next.splice(i, 1)
  emit('change', next)
}
</script>

<template>
  <div class="uploader">
    <div class="up-head">
      <div>
        <div class="up-title">{{ title }}<span v-if="required" class="req">必传</span></div>
        <div class="up-desc">{{ desc }}</div>
      </div>
      <span class="up-count num">{{ files.length }}/{{ max }}</span>
    </div>

    <div class="thumbs">
      <div v-for="(f, i) in files" :key="i" class="thumb">
        <img v-if="f.url" :src="f.url" alt="" />
        <div v-else class="thumb-doc"><Icon name="doc" :size="22" /><span>{{ f.name }}</span></div>
        <button class="thumb-del" aria-label="删除" @click="remove(i)"><Icon name="close" :size="12" /></button>
      </div>
      <button v-if="files.length < max" class="add" :disabled="busy" @click="pick">
        <Icon :name="busy ? 'refresh' : 'camera'" :size="20" />
        <span>{{ busy ? '上传中' : '拍照或相册' }}</span>
      </button>
    </div>

    <div v-if="samples.length && files.length < max" class="samples">
      <span class="tiny muted">可使用示例：</span>
      <button v-for="s in samples" :key="s" class="sample-chip" @click="useSample(s)">{{ s }}</button>
    </div>

    <p v-if="err" class="tiny" style="color:var(--seal);margin-top:6px">{{ err }}</p>
    <input ref="inputEl" type="file" accept="image/*" multiple hidden @change="onChange" />
  </div>
</template>

<style scoped>
.uploader { padding: 2px 0; }
.up-head { display: flex; align-items: flex-start; gap: 10px; }
.up-title { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.req {
  font-size: 10px; color: var(--brand-ink); background: var(--brand-tint);
  padding: 2px 6px; border-radius: 6px; font-weight: 600;
}
.up-desc { font-size: 12px; color: var(--ink-3); margin-top: 4px; line-height: 1.55; }
.up-count { margin-left: auto; font-size: 11.5px; color: var(--ink-3); flex: none; background: var(--fill); padding: 2px 8px; border-radius: 8px; }
.thumbs { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 13px; }
.thumb { position: relative; width: 78px; height: 78px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); background: var(--fill); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-doc { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; color: var(--ink-3); font-size: 9.5px; padding: 4px; text-align: center; }
.thumb-doc span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.thumb-del {
  position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border-radius: 50%;
  background: rgba(20, 24, 30, .58); color: #fff; display: grid; place-items: center;
  backdrop-filter: blur(4px);
}
.add {
  width: 78px; height: 78px; border-radius: 14px; border: 1.5px dashed rgba(60, 60, 67, .18);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  font-size: 11px; color: var(--ink-3); background: var(--fill);
}
.add:disabled { opacity: .55; }
.samples { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.sample-chip {
  font-size: 11.5px; color: var(--brand-ink); background: var(--brand-tint);
  padding: 5px 10px; border-radius: 10px; font-weight: 500;
}
</style>
