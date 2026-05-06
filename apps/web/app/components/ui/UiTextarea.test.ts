import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiTextarea from './UiTextarea.vue'

describe('UiTextarea', () => {
  it('renders rows, placeholder and current value', () => {
    const wrapper = mount(UiTextarea, {
      props: {
        modelValue: 'Descricao inicial',
        placeholder: 'Digite a descricao',
        rows: 8
      }
    })

    const textarea = wrapper.get('textarea')

    expect((textarea.element as HTMLTextAreaElement).value).toBe('Descricao inicial')
    expect(textarea.attributes('placeholder')).toBe('Digite a descricao')
    expect(textarea.attributes('rows')).toBe('8')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(UiTextarea, {
      props: {
        modelValue: ''
      }
    })

    await wrapper.get('textarea').setValue('Novo texto')

    expect(wrapper.emitted('update:modelValue')).toEqual([['Novo texto']])
  })

  it('applies the invalid class when invalid is true', () => {
    const wrapper = mount(UiTextarea, {
      props: {
        invalid: true
      }
    })

    expect(wrapper.get('textarea').classes()).toContain('border-[rgba(255,107,107,0.72)]')
  })
})
