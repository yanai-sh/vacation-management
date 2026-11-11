import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RequesterView from '@/views/RequesterView.vue'
import type { UserRole } from '@/types'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    roles?: UserRole[]
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
      path: '/requester',
      name: 'requester',
      component: RequesterView,
      meta: { roles: ['requester'] },
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
  const role = store.getters['auth/role'] as UserRole | null

  if (to.meta.public) {
    if (isAuthenticated && to.name === 'login') {
      return { name: role === 'requester' ? 'requester' : 'home' }
    }
    return true
  }

  if (!isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'home' && role === 'requester') {
    return { name: 'requester' }
  }

  if (to.meta.roles && role && !to.meta.roles.includes(role)) {
    return { name: 'home' }
  }

  return true
})

export default router
