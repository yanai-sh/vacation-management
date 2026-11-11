import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
  ],
})

let restored = false

router.beforeEach(async (to) => {
  if (!restored) {
    restored = true
    if (store.state.auth.token) {
      await store.dispatch('auth/restore')
    }
  }

  const isAuthenticated = store.getters['auth/isAuthenticated'] as boolean

  if (to.meta.public) {
    if (isAuthenticated && to.name === 'login') {
      return { name: 'home' }
    }
    return true
  }

  if (!isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  return true
})

export default router
