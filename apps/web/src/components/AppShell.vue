<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import type { RootState } from '@/store'

const store = useStore<RootState>()
const router = useRouter()

const user = computed(() => store.state.auth.user)
const role = computed(() => user.value?.role)

async function logout() {
  await store.dispatch('auth/logout')
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-muted text-default">
    <header class="border-b border-default bg-elevated">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold tracking-tight text-highlighted">
            Vacation Management
          </p>
          <p v-if="user" class="truncate text-xs text-muted">
            {{ user.name }}
            <span class="text-dimmed"> · {{ role }}</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1 sm:gap-2">
          <UColorModeButton size="sm" />
          <UButton
            v-if="user"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-log-out"
            label="Log out"
            class="hidden sm:inline-flex"
            @click="logout"
          />
          <UButton
            v-if="user"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-log-out"
            aria-label="Log out"
            class="sm:hidden"
            @click="logout"
          />
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
