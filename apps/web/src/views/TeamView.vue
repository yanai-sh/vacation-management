<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import AppShell from '@/components/AppShell.vue'
import RequestTable from '@/components/RequestTable.vue'
import { getErrorMessage } from '@/api/client'
import type { RootState } from '@/store'

const store = useStore<RootState>()
const error = ref('')

onMounted(async () => {
  try {
    await store.dispatch('vacations/loadTeam')
  } catch (err) {
    error.value = getErrorMessage(err)
  }
})
</script>

<template>
  <AppShell>
    <div class="space-y-8">
      <h1
        class="flex items-center gap-3 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl"
      >
        <span class="flex size-10 items-center justify-center rounded-lg bg-info/15 text-info">
          <UIcon name="i-lucide-users" class="size-5" />
        </span>
        Team time off
      </h1>
      <UAlert v-if="error" color="error" variant="subtle" :title="error" />
      <RequestTable
        :items="store.state.vacations.teamItems"
        :loading="store.state.vacations.loading"
        show-user
      />
    </div>
  </AppShell>
</template>
