import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip'
import Aura from '@primeuix/themes/aura'
import router from './router/index.js'
import App from './App.vue'
import FieldInfo from './components/catalog/FieldInfo.vue'
import './assets/main.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark',
      cssLayer: {
        name: 'primevue',
        order: 'tailwind-utilities, primevue'
      }
    }
  }
})
app.use(ToastService)
app.directive('tooltip', Tooltip)
app.component('FieldInfo', FieldInfo)

app.mount('#app')
