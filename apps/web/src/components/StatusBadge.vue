<script setup lang="ts">
import type { VacationStatus } from '@/types'

defineProps<{ status: VacationStatus }>()

const color: Record<VacationStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
}

const icon: Record<VacationStatus, string> = {
  pending: 'i-lucide-clock',
  approved: 'i-lucide-check',
  rejected: 'i-lucide-x',
}
</script>

<template>
  <UBadge :color="color[status]" :icon="icon[status]" variant="soft" class="capitalize">
    {{ status }}
  </UBadge>
</template>
