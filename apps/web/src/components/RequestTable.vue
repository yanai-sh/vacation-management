<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import StatusBadge from './StatusBadge.vue'
import type { VacationRequest } from '@/types'
import { formatStay } from '@/utils/dates'

const props = defineProps<{
  items: VacationRequest[]
  loading?: boolean
  busyId?: number | null
  showUser?: boolean
  showActions?: boolean
  showCancel?: boolean
}>()

const emit = defineEmits<{
  approve: [id: number]
  reject: [id: number]
  cancel: [id: number]
}>()

const columns = computed(() => {
  const cols: TableColumn<VacationRequest>[] = []

  if (props.showUser) {
    cols.push({ id: 'employee', header: 'Employee' })
  }

  cols.push({ id: 'status', header: 'Status' }, { id: 'dates', header: 'Dates' })

  if (props.showActions || props.showCancel) {
    cols.push({ id: 'actions', header: 'Actions' })
  }

  return cols
})
</script>

<template>
  <UCard
    :ui="{
      root: 'min-w-0 bg-elevated ring ring-default',
      body: 'overflow-x-auto p-0 sm:p-0',
    }"
  >
    <UTable
      :data="items"
      :columns="columns"
      :loading="loading"
      loading-color="primary"
      loading-animation="carousel"
      :ui="{ root: 'overflow-visible' }"
      class="min-w-160 text-sm"
    >
      <template #employee-cell="{ row }">
        {{ row.original.user?.name ?? '—' }}
      </template>
      <template #dates-cell="{ row }">
        {{ formatStay(row.original.startDate, row.original.endDate).range }}
      </template>
      <template #status-cell="{ row }">
        <StatusBadge :status="row.original.status" />
      </template>
      <template #actions-cell="{ row }">
        <div v-if="row.original.status === 'pending'" class="flex flex-wrap gap-2">
          <UButton
            v-if="showActions"
            size="sm"
            color="success"
            variant="soft"
            label="Approve"
            :loading="busyId === row.original.id"
            :disabled="busyId != null"
            @click="emit('approve', row.original.id)"
          />
          <UButton
            v-if="showActions"
            size="sm"
            color="error"
            variant="soft"
            label="Reject"
            :disabled="busyId != null"
            @click="emit('reject', row.original.id)"
          />
          <UButton
            v-if="showCancel"
            size="sm"
            color="neutral"
            variant="outline"
            label="Cancel"
            :loading="busyId === row.original.id"
            :disabled="busyId != null"
            @click="emit('cancel', row.original.id)"
          />
        </div>
      </template>
      <template #empty>
        <div class="py-8 text-center text-sm text-muted">No requests yet.</div>
      </template>
    </UTable>
  </UCard>
</template>
