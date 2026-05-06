import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UiPanel from './UiPanel.vue'

describe('UiPanel', () => {
  it('renders as a section by default', () => {
    const wrapper = mount(UiPanel, {
      slots: {
        default: 'Conteudo'
      }
    })

    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.text()).toBe('Conteudo')
    expect(wrapper.classes()).toContain('p-5')
  })

  it('supports custom tag, tone and padding', () => {
    const wrapper = mount(UiPanel, {
      props: {
        as: 'article',
        tone: 'hero',
        padding: 'lg'
      },
      slots: {
        default: 'Hero panel'
      }
    })

    expect(wrapper.element.tagName).toBe('ARTICLE')
    expect(wrapper.classes()).toContain('p-8')
    expect(wrapper.classes()).toContain('border-white/14')
  })
})
