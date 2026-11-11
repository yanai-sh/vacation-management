import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders the status label', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'pending' },
      global: {
        stubs: {
          UBadge: {
            template: '<span><slot /></span>',
          },
        },
      },
    })
    expect(wrapper.text()).toContain('pending')
  })
})
