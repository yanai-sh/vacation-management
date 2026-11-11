<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import type { VacationRequest } from '@/types'
import { formatStay } from '@/utils/dates'

const props = defineProps<{
  upcoming: VacationRequest[]
  earlier: VacationRequest[]
  loading?: boolean
  busyId?: number | null
  emptyTitle: string
}>()

const emit = defineEmits<{
  cancel: [id: number]
}>()

function dayLabel(days: number | null): string {
  if (days == null) return ''
  return days === 1 ? '1 day' : `${days} days`
}

const rows = computed(() => {
  const toRow = (request: VacationRequest) => {
    const stay = formatStay(request.startDate, request.endDate)
    return {
      kind: 'request' as const,
      request,
      range: stay.range,
      days: dayLabel(stay.days),
      pending: request.status === 'pending',
    }
  }
  const upcoming = props.upcoming.map(toRow)
  const earlier = props.earlier.map(toRow)
  if (upcoming.length === 0 || earlier.length === 0) return [...upcoming, ...earlier]
  return [...upcoming, { kind: 'earlier' as const }, ...earlier]
})
</script>

<template>
  <UCard :ui="{ root: 'bg-elevated ring ring-default', body: 'p-0 sm:p-0' }">
    <p v-if="loading" class="px-4 py-10 text-center text-sm text-muted" role="status">
      Loading requests…
    </p>
    <div v-else-if="rows.length === 0" class="px-4 py-10 text-center">
      <p class="text-sm text-highlighted">{{ emptyTitle }}</p>
      <slot />
    </div>
    <ul v-else class="divide-y divide-default">
      <li v-for="row in rows" :key="row.kind === 'earlier' ? 'earlier' : row.request.id">
        <p v-if="row.kind === 'earlier'" class="px-4 py-2 text-sm text-muted">Earlier</p>
        <div
          v-else
          class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0 space-y-1">
            <p class="text-sm text-default">
              <span v-if="row.days" class="font-medium text-highlighted">{{ row.days }}</span>
              <span class="text-muted">{{ row.days ? ` ${row.range}` : row.range }}</span>
            </p>
            <p v-if="row.request.reason" class="max-w-xl text-sm text-default">
              {{ row.request.reason }}
            </p>
            <p v-if="row.request.comments" class="max-w-xl text-sm text-muted">
              Reviewer: {{ row.request.comments }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <StatusBadge :status="row.request.status" />
            <UButton
              v-if="row.pending"
              size="sm"
              color="neutral"
              variant="outline"
              label="Cancel"
              :aria-label="`Cancel ${row.range}`"
              :loading="busyId === row.request.id"
              :disabled="busyId != null"
              @click="emit('cancel', row.request.id)"
            />
          </div>
        </div>
      </li>
    </ul>
  </UCard>
</template>
