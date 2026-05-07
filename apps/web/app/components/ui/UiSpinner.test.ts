import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiSpinner from './UiSpinner.vue'

describe('UiSpinner', () => {
  it('renders with default accessibility label and medium size', () => {
    const wrapper = mount(UiSpinner)

    expect(wrapper.attributes('aria-label')).toBe('Carregando')
    expect(wrapper.find('[aria-hidden="true"]').classes()).toContain('h-6')
  })

  it('supports custom size, tone and visible slot content', () => {
    const wrapper = mount(UiSpinner, {
      props: {
        size: 'lg',
        tone: 'neutral',
        label: 'Buscando cursos'
      },
      slots: {
        default: '<span class="body-copy">Buscando cursos...</span>'
      }
    })

    const spinner = wrapper.find('[aria-hidden="true"]')

    expect(wrapper.attributes('aria-label')).toBe('Buscando cursos')
    expect(spinner.classes()).toContain('h-10')
    expect(spinner.classes()).toContain('border-white/12')
    expect(wrapper.text()).toContain('Buscando cursos...')
  })
})
