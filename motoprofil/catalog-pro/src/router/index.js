import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'search',
    component: () => import('../views/SearchView.vue')
  },
  {
    path: '/parcourir',
    name: 'browse',
    component: () => import('../views/BrowseView.vue')
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue')
  },
  {
    path: '/analyse',
    name: 'analyse',
    component: () => import('../views/AnalyseView.vue')
  },
  {
    path: '/qualite',
    name: 'qualite',
    component: () => import('../views/QualiteView.vue')
  },
  {
    path: '/export',
    name: 'export',
    component: () => import('../views/ExportView.vue')
  },
  {
    path: '/parametres',
    name: 'settings',
    component: () => import('../views/SettingsView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
