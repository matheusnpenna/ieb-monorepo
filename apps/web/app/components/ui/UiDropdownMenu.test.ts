import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import UiDropdownMenu from './UiDropdownMenu.vue'

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

describe('UiDropdownMenu', () => {
  it('renders a two-letter avatar fallback when the user has first and last name', async () => {
    const wrapper = mount(UiDropdownMenu, {
      props: {
        userName: 'Jane Doe',
        items: [{ id: 'account', label: 'Dados da conta', to: '/home#perfil' }]
      },
      global: {
        components: {
          NuxtLink: NuxtLinkStub
        }
      }
    })

    expect(wrapper.get('.avatar-fallback').text()).toBe('JD')

    await wrapper.get('.dropdown-toggle').trigger('click')

    expect(wrapper.text()).toContain('Dados da conta')
  })

  it('renders a one-letter avatar fallback when the user has a single-word name', () => {
    const wrapper = mount(UiDropdownMenu, {
      props: {
        userName: 'Madonna',
        items: [{ id: 'logout', label: 'Sair' }]
      }
    })

    expect(wrapper.get('.avatar-fallback').text()).toBe('M')
  })

  it('emits the selected item id for action items', async () => {
    const wrapper = mount(UiDropdownMenu, {
      props: {
        userName: 'Jane Doe',
        items: [{ id: 'logout', label: 'Sair', tone: 'danger' }]
      }
    })

    await wrapper.get('.dropdown-toggle').trigger('click')
    await wrapper.get('button.dropdown-item').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['logout']])
  })
})
