<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="page">
    <div class="empty" style="padding-top:120px">
      <div class="t">页面不存在</div>
      <div class="small">请从首页重新进入</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:16px;display:inline-flex" @click="router.push('/')">返回首页</button>
    </div>
  </div>
</template>
