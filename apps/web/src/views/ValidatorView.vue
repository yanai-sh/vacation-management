<script setup lang="ts">
import { useToast } from '@nuxt/ui/composables/useToast'
import { computed, onMounted, shallowRef } from 'vue'
import { useStore } from 'vuex'
import AppShell from '@/components/AppShell.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import RejectModal from '@/components/RejectModal.vue'
import ReviewQueue from '@/components/ReviewQueue.vue'
import { getErrorMessage } from '@/api/client'
import type { RootState } from '@/store'
import type { VacationRequest, VacationStatus } from '@/types'
import { formatStay } from '@/utils/dates'

const store = useStore<RootState>()
const toast = useToast()
const error = shallowRef('')
const rejectOpen = shallowRef(false)
const approveOpen = shallowRef(false)
const rejectTarget = shallowRef<VacationRequest | null>(null)
const approveTarget = shallowRef<VacationRequest | null>(null)
const rejectLoading = shallowRef(false)
const approveLoading = shallowRef(false)
const busyId = shallowRef<number | null>(null)

const statusFilter = computed({
  get: () => store.state.vacations.statusFilter,
  set: (value: VacationStatus | '') => {
    store.commit('vacations/setFilters', {
      statusFilter: value,
      userFilter: store.state.vacations.userFilter,
    })
  },
})

const userFilter = computed({
  get: () => {
    const id = store.state.vacations.userFilter
    return id === '' ? 'all' : String(id)
  },
  set: (value: string | null) => {
    const parsed = !value || value === 'all' ? '' : Number(value)
    store.commit('vacations/setFilters', {
      statusFilter: store.state.vacations.statusFilter,
      userFilter: parsed === '' || Number.isNaN(parsed) ? '' : parsed,
    })
  },
})

const statusItems: { label: string; value: VacationStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const userItems = computed(() => [
  { label: 'All people', value: 'all' },
  ...store.state.vacations.requesterUsers.map((user) => ({
    label: user.name,
    value: String(user.id),
  })),
])

const listLoading = computed(() => store.state.vacations.loading && busyId.value == null)

const summary = computed(() => {
  if (listLoading.value || error.value) return ''
  const total = store.state.vacations.total
  if (statusFilter.value === 'pending') {
    return total === 1 ? '1 waiting' : `${total} waiting`
  }
  return total === 1 ? '1 request' : `${total} requests`
})

const filtersActive = computed(
  () => statusFilter.value !== '' || store.state.vacations.userFilter !== '',
)

const emptyTitle = computed(() => {
  if (!filtersActive.value) return 'No requests yet.'
  if (statusFilter.value === 'pending' && store.state.vacations.userFilter === '') {
    return 'Nothing waiting for a decision.'
  }
  return 'No requests match these filters.'
})

const showPagination = computed(() => store.state.vacations.total > store.state.vacations.pageSize)

function requestSummary(request: VacationRequest): string {
  const stay = formatStay(request.startDate, request.endDate)
  const who = request.user?.name ?? 'This person'
  const length = stay.days == null ? '' : stay.days === 1 ? ' (1 day)' : ` (${stay.days} days)`
  return `${who}, ${stay.range}${length}.`
}

const approveDescription = computed(() =>
  approveTarget.value ? `${requestSummary(approveTarget.value)} This cannot be changed.` : '',
)

const rejectDescription = computed(() =>
  rejectTarget.value ? requestSummary(rejectTarget.value) : '',
)

const pageError = computed(() => (approveOpen.value || rejectOpen.value ? '' : error.value))

async function refresh(resetPage = false) {
  error.value = ''
  try {
    if (resetPage) store.commit('vacations/setPage', 1)
    await store.dispatch('vacations/loadValidator')
  } catch (err) {
    error.value = getErrorMessage(err)
  }
}

onMounted(async () => {
  try {
    await store.dispatch('vacations/loadRequesterUsers')
  } catch {
    // The person filter falls back to everyone. The queue still loads.
  }
  await refresh(true)
})

function findRequest(id: number) {
  return store.state.vacations.validatorItems.find((item) => item.id === id) ?? null
}

function setStatus(value: VacationStatus | '') {
  if (statusFilter.value === value) return
  statusFilter.value = value
  void refresh(true)
}

function showAll() {
  statusFilter.value = ''
  userFilter.value = 'all'
  void refresh(true)
}

function openApprove(id: number) {
  const request = findRequest(id)
  if (!request) return
  approveTarget.value = request
  error.value = ''
  approveOpen.value = true
}

function openReject(id: number) {
  const request = findRequest(id)
  if (!request) return
  rejectTarget.value = request
  error.value = ''
  rejectOpen.value = true
}

async function confirmApprove() {
  if (approveTarget.value == null) return
  error.value = ''
  approveLoading.value = true
  busyId.value = approveTarget.value.id
  try {
    await store.dispatch('vacations/approve', approveTarget.value.id)
    approveOpen.value = false
    approveTarget.value = null
    toast.add({
      title: 'Request approved',
      color: 'success',
      icon: 'i-lucide-check',
    })
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    approveLoading.value = false
    busyId.value = null
  }
}

async function confirmReject(comment: string) {
  if (rejectTarget.value == null) return
  error.value = ''
  rejectLoading.value = true
  busyId.value = rejectTarget.value.id
  try {
    await store.dispatch('vacations/reject', { id: rejectTarget.value.id, comment })
    rejectOpen.value = false
    rejectTarget.value = null
    toast.add({
      title: 'Request rejected',
      color: 'warning',
      icon: 'i-lucide-ban',
    })
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    rejectLoading.value = false
    busyId.value = null
  }
}

async function onPageChange(page: number) {
  store.commit('vacations/setPage', page)
  await refresh(false)
}
</script>

<template>
  <AppShell>
    <div class="space-y-6">
      <h1
        class="flex items-center gap-3 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl"
      >
        <span
          class="flex size-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary"
        >
          <UIcon name="i-lucide-clipboard-check" class="size-5" />
        </span>
        Review requests
      </h1>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <UFieldGroup size="sm" aria-label="Status">
          <UButton
            v-for="item in statusItems"
            :key="item.label"
            :label="item.label"
            size="sm"
            :color="statusFilter === item.value ? 'primary' : 'neutral'"
            :variant="statusFilter === item.value ? 'soft' : 'outline'"
            :aria-pressed="statusFilter === item.value"
            @click="setStatus(item.value)"
          />
        </UFieldGroup>
        <div class="flex items-center gap-3">
          <USelect
            v-model="userFilter"
            :items="userItems"
            size="sm"
            color="neutral"
            variant="outline"
            class="w-full sm:w-52"
            aria-label="Person"
            @update:model-value="refresh(true)"
          />
          <p v-if="summary" class="shrink-0 text-sm text-muted">{{ summary }}</p>
        </div>
      </div>

      <UAlert v-if="pageError" color="error" variant="subtle" :title="pageError" />

      <ReviewQueue
        v-else
        :items="store.state.vacations.validatorItems"
        :loading="listLoading"
        :busy-id="busyId"
        :empty-title="emptyTitle"
        @approve="openApprove"
        @reject="openReject"
      >
        <UButton
          v-if="filtersActive"
          class="mt-3"
          size="sm"
          color="neutral"
          variant="outline"
          label="Show all"
          @click="showAll"
        />
      </ReviewQueue>

      <div v-if="showPagination && !pageError" class="flex justify-end">
        <UPagination
          :page="store.state.vacations.page"
          :items-per-page="store.state.vacations.pageSize"
          :total="store.state.vacations.total"
          @update:page="onPageChange"
        />
      </div>

      <ConfirmModal
        v-model:open="approveOpen"
        title="Approve this request?"
        :description="approveDescription"
        confirm-label="Approve"
        confirm-color="success"
        :loading="approveLoading"
        :error="approveOpen ? error : ''"
        @confirm="confirmApprove"
      />
      <RejectModal
        v-model:open="rejectOpen"
        :description="rejectDescription"
        :loading="rejectLoading"
        :error="rejectOpen ? error : ''"
        @confirm="confirmReject"
      />
    </div>
  </AppShell>
</template>
