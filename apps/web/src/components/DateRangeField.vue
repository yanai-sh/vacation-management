<script setup lang="ts">
import type { CalendarDate, DateValue } from '@internationalized/date'
import { toCalendarDate } from '@internationalized/date'
import { useFormField } from '@nuxt/ui/composables/useFormField'
import { computed, shallowRef, watch } from 'vue'
import { formatStay, normalizeStayRange, toIsoDate } from '@/utils/dates'

const start = defineModel<CalendarDate | undefined>('start')
const end = defineModel<CalendarDate | undefined>('end')

defineProps<{
  minValue?: DateValue
}>()

const { id, emitFormBlur, emitFormChange, color, highlight, disabled, ariaAttrs } = useFormField()

const open = shallowRef(false)
const suspendRange = shallowRef(false)
const range = shallowRef<{ start?: CalendarDate; end?: CalendarDate }>({
  start: start.value,
  end: end.value,
})

const stay = computed(() =>
  start.value && end.value ? formatStay(toIsoDate(start.value), toIsoDate(end.value)) : null,
)

const buttonLabel = computed(() => {
  if (stay.value) return stay.value.range
  if (start.value)
    return `${formatStay(toIsoDate(start.value), toIsoDate(start.value)).range} – Last day`
  return 'First day – Last day'
})

const dayLabel = computed(() => {
  const days = stay.value?.days
  if (days == null) return ''
  return days === 1 ? '1 day' : `${days} days`
})

function sameDay(left?: CalendarDate, right?: CalendarDate): boolean {
  if (!left || !right) return left === right
  return left.compare(right) === 0
}

function applyRange(nextStart?: CalendarDate, nextEnd?: CalendarDate, close = false) {
  const changed = !sameDay(start.value, nextStart) || !sameDay(end.value, nextEnd)
  if (!sameDay(start.value, nextStart)) start.value = nextStart
  if (!sameDay(end.value, nextEnd)) end.value = nextEnd
  if (close) open.value = false
  if (changed || close) emitFormChange()
}

function clearDates() {
  suspendRange.value = true
  start.value = undefined
  end.value = undefined
  range.value = { start: undefined, end: undefined }
  emitFormChange()
}

watch(range, (value, previous) => {
  if (suspendRange.value) {
    suspendRange.value = false
    return
  }
  const incomingStart = value.start ? toCalendarDate(value.start) : undefined
  const incomingEnd = value.end ? toCalendarDate(value.end) : undefined
  const prevStart = previous?.start ? toCalendarDate(previous.start) : undefined
  // Reka swaps an earlier second click into a finished range. Start over from that day.
  if (
    prevStart &&
    !previous?.end &&
    incomingStart &&
    incomingEnd &&
    incomingStart.compare(prevStart) < 0 &&
    sameDay(incomingEnd, prevStart)
  ) {
    range.value = { start: incomingStart, end: undefined }
    return
  }
  // Escape clears the highlight. A first day alone is not a finished request.
  if (prevStart && !previous?.end && !incomingStart) {
    range.value = { start: prevStart, end: undefined }
    return
  }

  const next = normalizeStayRange(incomingStart, incomingEnd)
  if (next.start && next.end && sameDay(next.start, next.end)) {
    if (value.end) range.value = { start: next.start, end: undefined }
    else applyRange(next.start, undefined, false)
    return
  }
  if (!sameDay(value.start, next.start) || !sameDay(value.end, next.end)) {
    range.value = next
    return
  }
  // Leave the calendar end empty so the next click can choose a later day.
  if (next.start && !next.end) {
    applyRange(next.start, undefined, false)
    return
  }
  applyRange(next.start, next.end, Boolean(next.start && next.end))
})

watch([start, end], ([nextStart, nextEnd]) => {
  if (suspendRange.value) return
  if (
    open.value &&
    nextStart &&
    range.value.start &&
    !range.value.end &&
    sameDay(nextStart, nextEnd)
  ) {
    return
  }
  if (sameDay(range.value.start, nextStart) && sameDay(range.value.end, nextEnd)) return
  range.value = { start: nextStart, end: nextEnd }
})

watch(open, (isOpen, wasOpen) => {
  if (!wasOpen || isOpen) return
  if (start.value && end.value && end.value.compare(start.value) <= 0) {
    end.value = undefined
  }
  if (start.value && end.value && !range.value.end) {
    range.value = { start: start.value, end: end.value }
  }
  emitFormBlur()
})
</script>

<template>
  <UPopover v-model:open="open" :disabled="disabled">
    <UButton
      :id="id"
      type="button"
      :color="color ?? 'neutral'"
      :highlight="highlight"
      variant="outline"
      icon="i-lucide-calendar"
      class="w-full justify-start font-normal"
      :disabled="disabled"
      v-bind="ariaAttrs"
    >
      <span
        class="min-w-0 flex-1 truncate text-left"
        :class="start ? 'text-default' : 'text-muted'"
      >
        {{ buttonLabel }}
      </span>
      <span v-if="dayLabel" class="ml-auto shrink-0 text-muted">{{ dayLabel }}</span>
    </UButton>
    <template #content>
      <div class="w-max max-w-[calc(100vw-2rem)] overflow-x-auto p-3">
        <!-- Fixed day size: w-full inside a 7-column grid collapses both months. -->
        <UCalendar
          v-model="range"
          range
          prevent-deselect
          color="primary"
          :min-value="minValue"
          :number-of-months="2"
          :paged-navigation="false"
          :year-controls="false"
          :view-control="false"
          :ui="{
            root: 'w-max',
            grid: 'w-max',
            gridRow: 'place-items-stretch',
            cellTrigger:
              'm-0! size-12! min-w-12! rounded-none! data-outside-view:pointer-events-none! data-outside-view:invisible! data-selection-start:rounded-s-full! data-selection-end:rounded-e-full! data-highlighted-start:rounded-s-full! data-highlighted-end:rounded-e-full!',
          }"
        />
        <div class="mt-1 flex items-start justify-between gap-4 border-t border-default px-2 pt-2">
          <div class="min-w-0 text-sm">
            <p v-if="stay">
              {{ stay.range }}
              <span class="text-muted">({{ dayLabel }})</span>
            </p>
            <p v-else class="text-muted">Choose the first day off.</p>
            <p v-if="range.start && !range.end" class="text-muted">Choose a later last day.</p>
          </div>
          <UButton
            v-if="start"
            type="button"
            variant="link"
            color="neutral"
            label="Clear dates"
            class="shrink-0 px-0"
            @click="clearDates"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
