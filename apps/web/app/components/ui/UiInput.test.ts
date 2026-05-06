import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiInput from './UiInput.vue'

describe('UiInput', () => {
  it('renders the current value and placeholder', () => {
    const wrapper = mount(UiInput, {
      props: {
        modelValue: 'Jane Doe',
        placeholder: 'Digite seu nome'
      }
    })

    const input = wrapper.get('input')

    expect((input.element as HTMLInputElement).value).toBe('Jane Doe')
    expect(input.attributes('placeholder')).toBe('Digite seu nome')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(UiInput, {
      props: {
        modelValue: ''
      }
    })

    await wrapper.get('input').setValue('novo valor')

    expect(wrapper.emitted('update:modelValue')).toEqual([['novo valor']])
  })

  it('applies the invalid class when invalid is true', () => {
    const wrapper = mount(UiInput, {
      props: {
        invalid: true
      }
    })

    expect(wrapper.get('input').classes()).toContain('border-[rgba(255,107,107,0.72)]')
  })
})
