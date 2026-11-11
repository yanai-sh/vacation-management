import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'
import LoginView from '@/views/LoginView.vue'
import RequesterView from '@/views/RequesterView.vue'
import ValidatorView from '@/views/ValidatorView.vue'
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
      path: '/validator',
      name: 'validator',
      component: ValidatorView,
      meta: { roles: ['validator'] },
    },
    {
      path: '/',
      name: 'home',
      redirect: () => {
        const role = store.state.auth.user?.role
        if (role === 'validator') return { name: 'validator' }
        if (role === 'requester') return { name: 'requester' }
        return { name: 'login' }
      },
    },
  ],
})

let restored = false

router.beforeEach(async (to) => {
  if (!restored) {
    restored = true
    // Public routes with no token can render immediately; restore only when a session may exist.
    if (store.state.auth.token) {
      await store.dispatch('auth/restore')
    }
  }

  const isAuthenticated = store.getters['auth/isAuthenticated'] as boolean
  const role = store.getters['auth/role'] as UserRole | null

  if (to.meta.public) {
    if (to.name === 'login' && (role === 'requester' || role === 'validator')) {
      return { name: role }
    }
    return true
  }

  if (!isAuthenticated || !role) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.roles && !to.meta.roles.includes(role)) {
    return { name: role }
  }

  return true
})

export default router
