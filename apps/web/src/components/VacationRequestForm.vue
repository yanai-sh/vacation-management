<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { computed, shallowReactive, useTemplateRef } from 'vue'
import DateRangeField from '@/components/DateRangeField.vue'
import type { VacationStatus } from '@/types'
import { formatStay, localToday, toIsoDate } from '@/utils/dates'
import { validateVacationForm, type VacationFormState } from '@/utils/formValidation'
import { findBlockingRequest } from '@/utils/ownRequests'

const emit = defineEmits<{
  submit: [payload: { startDate: string; endDate: string; reason?: string }]
}>()

const props = defineProps<{
  submitting?: boolean
  existing: { startDate: string; endDate: string; status: VacationStatus }[]
}>()

const datesForm = useTemplateRef('datesForm')
const today = localToday()
// shallowReactive keeps CalendarDate instances intact (deep reactive proxies break them).
const state = shallowReactive<VacationFormState>({
  startDate: undefined,
  endDate: undefined,
  reason: '',
})

const conflictMessage = computed(() => {
  const { startDate, endDate } = state
  if (!startDate || !endDate || endDate.compare(startDate) <= 0 || startDate.compare(today) < 0) {
    return undefined
  }
  const conflict = findBlockingRequest(toIsoDate(startDate), toIsoDate(endDate), props.existing)
  if (!conflict) return undefined
  const stay = formatStay(conflict.startDate, conflict.endDate)
  return `These dates overlap your ${conflict.status} request (${stay.range}).`
})

function validate(formState: Partial<VacationFormState>) {
  const errors = validateVacationForm(formState, today)
  if (conflictMessage.value) {
    errors.push({ name: 'dates', message: conflictMessage.value })
  }
  return errors
}

function reset() {
  state.startDate = undefined
  state.endDate = undefined
  state.reason = ''
  datesForm.value?.clear()
}

function onSubmit(event: FormSubmitEvent<VacationFormState>) {
  const { startDate, endDate, reason } = event.data
  if (!startDate || !endDate || conflictMessage.value) return

  emit('submit', {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    reason: reason?.trim() || undefined,
  })
}

defineExpose({ reset })
</script>

<template>
  <UCard
    :ui="{
      root: 'bg-elevated ring ring-default divide-y divide-default',
      body: 'space-y-4',
    }"
  >
    <template #header>
      <h2 class="font-semibold text-highlighted">Request time off</h2>
    </template>

    <UForm
      ref="datesForm"
      :state="state"
      :validate="validate"
      :disabled="submitting"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField label="Dates" name="dates" required>
        <DateRangeField
          v-model:start="state.startDate"
          v-model:end="state.endDate"
          :min-value="today"
        />
      </UFormField>
      <UFormField label="Reason" name="reason" hint="Optional">
        <UTextarea
          v-model="state.reason"
          color="neutral"
          variant="outline"
          :rows="3"
          class="w-full"
          placeholder="Shown to your reviewer"
        />
      </UFormField>
      <div class="flex justify-end">
        <UButton type="submit" color="primary" label="Submit request" :loading="submitting" />
      </div>
    </UForm>
  </UCard>
</template>
