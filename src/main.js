import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import { seedDemoOrders } from './store/seed.js'
import './styles/base.css'

// 首次打开时灌入示例服务记录，便于直接看到状态跟踪与评价；已有记录不覆盖
seedDemoOrders()

createApp(App).use(router).mount('#app')
