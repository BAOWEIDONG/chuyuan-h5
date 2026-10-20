<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import NavBar from '../components/NavBar.vue'
import ProgressDots from '../components/ProgressDots.vue'
import Uploader from '../components/Uploader.vue'
import { draft } from '../store/draft.js'

const router = useRouter()

const hospitalOk = computed(() => draft.materials.hospital.length > 0)
const addressOk = computed(() => draft.materials.address.length > 0)
const doctorOk = computed(() => !draft.lieFlatRequired || draft.materials.doctor.length > 0)
const valid = computed(() => hospitalOk.value && addressOk.value && doctorOk.value)

const missing = computed(() => {
  const m = []
  if (!hospitalOk.value) m.push('住院材料')
  if (!addressOk.value) m.push('住址证明')
  if (!doctorOk.value && draft.lieFlatRequired) m.push('平躺医嘱证明')
  return m
})

function setFiles(key, files) { draft.materials[key] = files }
</script>

<template>
  <div>
    <NavBar title="上传材料" back="/book/plan" />
    <div class="page with-bar">
      <ProgressDots :total="4" :current="3" :labels="['预约信息', '车型确认', '材料上传', '提交']" />

      <div class="alert info" style="margin-top:16px">
        <Icon name="info" :size="17" />
        <span>材料用于核验住院事实与住址，仅用于本次服务受理。照片需完整、清晰、无遮挡。</span>
      </div>

      <div class="card" style="margin-top:14px">
        <Uploader title="住院材料" required
                  desc="住院单、住院缴费凭证、住院证明或出院小结，任一项即可"
                  :files="draft.materials.hospital" :max="4"
                  :samples="['出院小结（示例）', '住院缴费凭证（示例）']"
                  @change="f => setFiles('hospital', f)" />
      </div>

      <div class="card">
        <Uploader title="住址证明材料" required
                  :desc="`与登记时选择的一致：${draft.address ? '' : ''}身份证、户口簿、房产证、居住证等`"
                  :files="draft.materials.address" :max="4"
                  :samples="['房产证（示例）', '身份证住址页（示例）']"
                  @change="f => setFiles('address', f)" />
      </div>

      <div v-if="draft.lieFlatRequired" class="card doctor-card">
        <Uploader title="主诊医生证明" required
                  desc="需写明可平躺出行，并加盖医院或科室章"
                  :files="draft.materials.doctor" :max="3"
                  :samples="['平躺医嘱证明（示例）']"
                  @change="f => setFiles('doctor', f)" />
      </div>

      <div class="section-title"><span class="t">材料清单</span></div>
      <div class="card checklist">
        <div class="ck" :class="{ ok: hospitalOk }">
          <Icon :name="hospitalOk ? 'check' : 'minus'" :size="15" />
          <span>住院材料</span>
          <span class="ck-s">{{ hospitalOk ? `已上传 ${draft.materials.hospital.length} 张` : '待上传' }}</span>
        </div>
        <div class="ck" :class="{ ok: addressOk }">
          <Icon :name="addressOk ? 'check' : 'minus'" :size="15" />
          <span>住址证明</span>
          <span class="ck-s">{{ addressOk ? `已上传 ${draft.materials.address.length} 张` : '待上传' }}</span>
        </div>
        <div v-if="draft.lieFlatRequired" class="ck" :class="{ ok: doctorOk }">
          <Icon :name="doctorOk ? 'check' : 'minus'" :size="15" />
          <span>平躺医嘱证明</span>
          <span class="ck-s">{{ doctorOk ? '已上传' : '待上传' }}</span>
        </div>
      </div>

      <p class="tiny muted" style="margin:18px 4px 0;line-height:1.7">
        材料不全或存疑时，服务方会暂缓或驳回申请。上传后如需更换，删除原图重新上传即可。
      </p>
    </div>

    <div class="action-bar">
      <button class="btn" :class="valid ? 'btn-primary' : 'btn-wait'" @click="router.push('/book/confirm')">
        <template v-if="valid">下一步：核对信息</template>
        <template v-else>还缺 {{ missing.join('、') }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.doctor-card { background: rgba(255, 249, 240, .92); border-color: rgba(255, 196, 130, .8); }
.checklist { padding: 6px 16px; }
.ck { display: flex; align-items: center; gap: 9px; font-size: 13.5px; padding: 11px 0; color: var(--ink-3); border-bottom: 1px solid var(--line); }
.ck:last-child { border-bottom: 0; }
.ck svg { color: rgba(60, 60, 67, .22); }
.ck.ok { color: var(--ink); font-weight: 500; }
.ck.ok svg { color: var(--green); }
.ck-s { margin-left: auto; font-size: 12px; color: var(--ink-3); font-weight: 400; }
</style>
