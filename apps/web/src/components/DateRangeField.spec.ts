import { CalendarDate } from '@internationalized/date'
import { mount } from '@vue/test-utils'
import { defineComponent, shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import DateRangeField from './DateRangeField.vue'

const Harness = defineComponent({
  components: { DateRangeField },
  setup() {
    const start = shallowRef<CalendarDate>()
    const end = shallowRef<CalendarDate>()
    const minValue = new CalendarDate(2026, 11, 11)
    return { start, end, minValue }
  },
  template: `
    <DateRangeField
      v-model:start="start"
      v-model:end="end"
      :min-value="minValue"
    />
  `,
})

describe('DateRangeField', () => {
  it('selects a start, highlights through the hovered day, then sets the end', async () => {
    const wrapper = mount(Harness, { attachTo: document.body })

    await wrapper.get('button').trigger('click')

    const day = (iso: string) => document.querySelector<HTMLElement>(`[data-value="${iso}"]`)
    const start = day('2026-11-18')
    const middle = day('2026-11-20')
    const end = day('2026-11-22')
    expect(start && middle && end).toBeTruthy()

    start!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.start?.toString()).toBe('2026-11-18')
    expect(wrapper.vm.end).toBeUndefined()
    expect(wrapper.text()).toContain('Nov 18, 2026')
    expect(wrapper.text()).not.toContain('1 day')
    expect(document.body.textContent).toContain('Choose a later last day.')

    middle!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(middle!.hasAttribute('data-highlighted')).toBe(true)
    expect(middle!.hasAttribute('data-selected')).toBe(false)

    end!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.start?.toString()).toBe('2026-11-18')
    expect(wrapper.vm.end?.toString()).toBe('2026-11-22')
    expect(wrapper.text()).toContain('Nov 22, 2026')
    expect(wrapper.text()).toContain('5 days')
    expect(end!.hasAttribute('data-selected')).toBe(true)

    wrapper.unmount()
  })

  it('does not keep a single day when the popup closes', async () => {
    const wrapper = mount(Harness, { attachTo: document.body })
    await wrapper.get('button').trigger('click')
    const day = document.querySelector<HTMLElement>('[data-value="2026-11-18"]')!
    day.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    await wrapper.get('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.start?.toString()).toBe('2026-11-18')
    expect(wrapper.vm.end).toBeUndefined()
    expect(wrapper.text()).not.toContain('1 day')
    wrapper.unmount()
  })

  it('starts over when the second click is earlier', async () => {
    const wrapper = mount(Harness, { attachTo: document.body })
    await wrapper.get('button').trigger('click')

    const day = (iso: string) => document.querySelector<HTMLElement>(`[data-value="${iso}"]`)
    day('2026-11-22')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    const earlier = day('2026-11-18')!
    earlier.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    earlier.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.start?.toString()).toBe('2026-11-18')
    expect(wrapper.vm.end).toBeUndefined()
    expect(wrapper.text()).not.toContain('1 day')
    expect(document.body.textContent).toContain('Choose a later last day.')
    wrapper.unmount()
  })

  it('selects a range across the two visible months', async () => {
    const wrapper = mount(Harness, { attachTo: document.body })
    await wrapper.get('button').trigger('click')
    const day = (iso: string) =>
      document.querySelector<HTMLElement>(`[data-value="${iso}"]:not([data-outside-view])`)
    const outside = document.querySelector<HTMLElement>(
      '[data-value="2026-12-01"][data-outside-view]',
    )!
    expect(outside.className).toContain('invisible')
    expect(document.querySelector('[data-unavailable]')).toBeNull()
    expect(document.querySelectorAll('[data-slot="grid"]')).toHaveLength(2)

    day('2026-11-27')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    const end = day('2026-12-04')!
    end.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    end.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.start?.toString()).toBe('2026-11-27')
    expect(wrapper.vm.end?.toString()).toBe('2026-12-04')
    expect(document.body.textContent).toContain('Clear dates')
    wrapper.unmount()
  })

  it('clears the selected dates', async () => {
    const wrapper = mount(Harness, { attachTo: document.body })
    await wrapper.get('button').trigger('click')
    document
      .querySelector<HTMLElement>('[data-value="2026-11-18"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    const clear = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Clear dates'),
    )!
    clear.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.start).toBeUndefined()
    expect(wrapper.vm.end).toBeUndefined()
    expect(document.body.textContent).toContain('Choose the first day off.')
    wrapper.unmount()
  })
})
