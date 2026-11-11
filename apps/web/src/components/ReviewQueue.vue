<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import type { VacationRequest } from '@/types'
import { formatStay } from '@/utils/dates'

const props = defineProps<{
  items: VacationRequest[]
  loading?: boolean
  busyId?: number | null
  emptyTitle: string
}>()

const emit = defineEmits<{
  approve: [id: number]
  reject: [id: number]
}>()

const rows = computed(() =>
  props.items.map((request) => {
    const stay = formatStay(request.startDate, request.endDate)
    const days = stay.days == null ? '' : stay.days === 1 ? '1 day' : `${stay.days} days`
    return {
      request,
      name: request.user?.name ?? 'Employee',
      range: stay.range,
      days,
      pending: request.status === 'pending',
    }
  }),
)
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
      <li
        v-for="row in rows"
        :key="row.request.id"
        class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 space-y-1">
          <p class="truncate font-medium text-highlighted">{{ row.name }}</p>
          <p class="text-sm text-default">
            <span v-if="row.days" class="font-medium">{{ row.days }}</span>
            <span class="text-muted">{{ row.days ? ` ${row.range}` : row.range }}</span>
          </p>
          <p v-if="row.request.reason" class="max-w-xl text-sm text-default">
            {{ row.request.reason }}
          </p>
          <p v-if="row.request.comments" class="max-w-xl text-sm text-muted">
            Decision: {{ row.request.comments }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <StatusBadge :status="row.request.status" />
          <template v-if="row.pending">
            <UButton
              size="sm"
              color="success"
              variant="soft"
              label="Approve"
              :aria-label="`Approve ${row.name}`"
              :loading="busyId === row.request.id"
              :disabled="busyId != null"
              @click="emit('approve', row.request.id)"
            />
            <UButton
              size="sm"
              color="error"
              variant="soft"
              label="Reject"
              :aria-label="`Reject ${row.name}`"
              :disabled="busyId != null"
              @click="emit('reject', row.request.id)"
            />
          </template>
        </div>
      </li>
    </ul>
  </UCard>
</template>
