import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiCheckbox from './UiCheckbox.vue'

describe('UiCheckbox', () => {
  it('renders the label and unchecked visual state by default', () => {
    const wrapper = mount(UiCheckbox, {
      props: {
        label: 'Aceito os termos'
      }
    })

    expect(wrapper.text()).toContain('Aceito os termos')
    expect(wrapper.find('input').element.checked).toBe(false)
  })

  it('emits the next boolean value when toggled', async () => {
    const wrapper = mount(UiCheckbox, {
      props: {
        modelValue: false,
        label: 'Receber avisos'
      }
    })

    await wrapper.find('input').setValue(true)

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
  })
})
