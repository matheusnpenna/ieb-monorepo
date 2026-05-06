import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiField from './UiField.vue'

describe('UiField', () => {
  it('renders the label, required marker and slot content', () => {
    const wrapper = mount(UiField, {
      props: {
        label: 'E-mail',
        required: true
      },
      slots: {
        default: '<input type="email" />'
      }
    })

    expect(wrapper.text()).toContain('E-mail')
    expect(wrapper.text()).toContain('*')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('renders the hint when there is no error', () => {
    const wrapper = mount(UiField, {
      props: {
        label: 'Senha',
        hint: 'Use pelo menos 8 caracteres'
      }
    })

    expect(wrapper.text()).toContain('Use pelo menos 8 caracteres')
  })

  it('prioritizes the error over the hint', () => {
    const wrapper = mount(UiField, {
      props: {
        label: 'CPF',
        hint: 'Somente numeros',
        error: 'CPF invalido'
      }
    })

    expect(wrapper.text()).toContain('CPF invalido')
    expect(wrapper.text()).not.toContain('Somente numeros')
  })
})
