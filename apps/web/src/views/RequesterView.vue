<script setup lang="ts">
import { useToast } from '@nuxt/ui/composables/useToast'
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import { useStore } from 'vuex'
import AppShell from '@/components/AppShell.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import OwnRequestList from '@/components/OwnRequestList.vue'
import VacationRequestForm from '@/components/VacationRequestForm.vue'
import { getErrorMessage } from '@/api/client'
import type { RootState } from '@/store'
import type { VacationRequest, VacationStatus } from '@/types'
import { formatStay, inclusiveDayCount, localToday, toIsoDate } from '@/utils/dates'
import { groupOwnRequests } from '@/utils/ownRequests'

const store = useStore<RootState>()
const toast = useToast()
const requestForm = useTemplateRef('requestForm')
const error = shallowRef('')
const submitting = shallowRef(false)
const busyId = shallowRef<number | null>(null)
const cancelId = shallowRef<number | null>(null)
const cancelOpen = shallowRef(false)
const statusFilter = shallowRef<VacationStatus | ''>('')
const today = toIsoDate(localToday())

const statusItems: { label: string; value: VacationStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const ownItems = computed(() => store.state.vacations.ownItems)

const summary = computed(() => {
  const pending = bookedDays(ownItems.value.filter((item) => item.status === 'pending'))
  const approved = bookedDays(
    ownItems.value.filter((item) => item.status === 'approved' && item.endDate >= today),
  )
  const parts: string[] = []
  if (pending) parts.push(pending === 1 ? '1 day waiting' : `${pending} days waiting`)
  if (approved) parts.push(approved === 1 ? '1 day approved' : `${approved} days approved`)
  return parts.join(', ')
})

const grouped = computed(() => {
  const items = statusFilter.value
    ? ownItems.value.filter((item) => item.status === statusFilter.value)
    : ownItems.value
  return groupOwnRequests(items, today)
})

const listLoading = computed(() => store.state.vacations.loading && ownItems.value.length === 0)

const emptyTitle = computed(() => {
  if (statusFilter.value === 'pending') return 'No requests waiting.'
  if (statusFilter.value === 'approved') return 'No approved requests.'
  if (statusFilter.value === 'rejected') return 'No rejected requests.'
  return 'You have no requests yet. Choose dates above to ask for time off.'
})

const cancelDescription = computed(() => {
  const request = ownItems.value.find((item) => item.id === cancelId.value)
  if (!request) return 'This pending request will be withdrawn.'
  const stay = formatStay(request.startDate, request.endDate)
  const length = stay.days == null ? '' : stay.days === 1 ? '1 day, ' : `${stay.days} days, `
  return `${length}${stay.range}. This request will be withdrawn.`
})

function bookedDays(items: VacationRequest[]): number {
  return items.reduce(
    (sum, item) => sum + (inclusiveDayCount(item.startDate, item.endDate) ?? 0),
    0,
  )
}

onMounted(async () => {
  try {
    await store.dispatch('vacations/loadOwn')
  } catch (err) {
    error.value = getErrorMessage(err)
  }
})

async function onSubmit(payload: { startDate: string; endDate: string; reason?: string }) {
  error.value = ''
  submitting.value = true
  try {
    await store.dispatch('vacations/create', payload)
    requestForm.value?.reset()
    toast.add({
      title: 'Request submitted',
      description: 'Your manager can review it from the validator dashboard.',
      color: 'success',
      icon: 'i-lucide-send',
    })
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

function askCancel(id: number) {
  cancelId.value = id
  cancelOpen.value = true
}

async function confirmCancel() {
  if (cancelId.value == null) return
  error.value = ''
  busyId.value = cancelId.value
  try {
    await store.dispatch('vacations/cancel', cancelId.value)
    cancelOpen.value = false
    cancelId.value = null
    toast.add({
      title: 'Request cancelled',
      color: 'neutral',
      icon: 'i-lucide-x',
    })
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <AppShell>
    <div class="space-y-8">
      <h1
        class="flex items-center gap-3 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl"
      >
        <span
          class="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary"
        >
          <UIcon name="i-lucide-calendar-plus" class="size-5" />
        </span>
        My requests
      </h1>
      <VacationRequestForm
        ref="requestForm"
        :submitting="submitting"
        :existing="ownItems"
        @submit="onSubmit"
      />
      <UAlert v-if="error" color="error" variant="subtle" :title="error" />
      <div
        v-if="ownItems.length"
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <UFieldGroup size="sm" aria-label="Status">
          <UButton
            v-for="item in statusItems"
            :key="item.label"
            :label="item.label"
            size="sm"
            :color="statusFilter === item.value ? 'primary' : 'neutral'"
            :variant="statusFilter === item.value ? 'soft' : 'outline'"
            :aria-pressed="statusFilter === item.value"
            @click="statusFilter = item.value"
          />
        </UFieldGroup>
        <p v-if="summary" class="text-sm text-muted">{{ summary }}</p>
      </div>
      <OwnRequestList
        v-if="!error || ownItems.length"
        :upcoming="grouped.upcoming"
        :earlier="grouped.earlier"
        :loading="listLoading"
        :busy-id="busyId"
        :empty-title="emptyTitle"
        @cancel="askCancel"
      >
        <UButton
          v-if="statusFilter"
          class="mt-3"
          size="sm"
          color="neutral"
          variant="outline"
          label="Show all"
          @click="statusFilter = ''"
        />
      </OwnRequestList>
      <ConfirmModal
        v-model:open="cancelOpen"
        title="Cancel this request?"
        :description="cancelDescription"
        confirm-label="Cancel request"
        :loading="busyId != null"
        @confirm="confirmCancel"
      />
    </div>
  </AppShell>
</template>
