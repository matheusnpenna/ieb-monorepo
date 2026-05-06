import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiSelect from './UiSelect.vue'

describe('UiSelect', () => {
  it('renders options and the selected value', () => {
    const wrapper = mount(UiSelect, {
      props: {
        modelValue: 'sertao'
      },
      slots: {
        default: `
          <option value="">Selecione</option>
          <option value="sertao">Sertao</option>
        `
      }
    })

    const select = wrapper.get('select')

    expect((select.element as HTMLSelectElement).value).toBe('sertao')
    expect(select.text()).toContain('Sertao')
  })

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(UiSelect, {
      props: {
        modelValue: ''
      },
      slots: {
        default: `
          <option value="">Selecione</option>
          <option value="panambi">Panambi</option>
        `
      }
    })

    await wrapper.get('select').setValue('panambi')

    expect(wrapper.emitted('update:modelValue')).toEqual([['panambi']])
  })

  it('applies the invalid class when invalid is true', () => {
    const wrapper = mount(UiSelect, {
      props: {
        invalid: true
      },
      slots: {
        default: '<option value="">Selecione</option>'
      }
    })

    expect(wrapper.get('select').classes()).toContain('border-[rgba(255,107,107,0.72)]')
  })
})
