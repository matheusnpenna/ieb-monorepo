import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import UiButton from './UiButton.vue'

const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: {
    to: {
      type: String,
      required: false
    }
  },
  template: '<a :href="to"><slot /></a>'
})

describe('UiButton', () => {
  it('renders as a button by default', () => {
    const wrapper = mount(UiButton, {
      slots: {
        default: 'Entrar'
      }
    })

    const button = wrapper.get('button')

    expect(button.text()).toBe('Entrar')
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toContain('w-auto')
  })

  it('renders as a link when the "to" prop is provided', () => {
    const wrapper = mount(UiButton, {
      props: {
        to: '/home'
      },
      slots: {
        default: 'Ir para home'
      },
      global: {
        components: {
          NuxtLink: NuxtLinkStub
        }
      }
    })

    const linkComponent = wrapper.getComponent(NuxtLinkStub)
    const link = wrapper.get('a')

    expect(linkComponent.props('to')).toBe('/home')
    expect(link.text()).toBe('Ir para home')
  })

  it('marks the button as busy and disabled while loading', () => {
    const wrapper = mount(UiButton, {
      props: {
        loading: true,
        block: true
      },
      slots: {
        default: 'Enviar'
      }
    })

    const button = wrapper.get('button')

    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.classes()).toContain('w-full')
    expect(button.classes()).toContain('pointer-events-none')
  })
})
