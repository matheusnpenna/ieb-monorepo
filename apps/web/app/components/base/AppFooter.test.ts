import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import AppFooter from './AppFooter.vue'

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

describe('AppFooter', () => {
  it('renders the dynamic year and institution information', () => {
    const wrapper = mount(AppFooter, {
      global: {
        components: {
          NuxtLink: NuxtLinkStub
        }
      }
    })

    expect(wrapper.text()).toContain('15.728.125/0001-00')
    expect(wrapper.text()).toContain(String(new Date().getFullYear()))
  })

  it('renders social and whatsapp links', () => {
    const wrapper = mount(AppFooter, {
      global: {
        components: {
          NuxtLink: NuxtLinkStub
        }
      }
    })

    const links = wrapper.findAll('a').map((link) => link.attributes('href'))

    expect(links).toContain('https://www.instagram.com/comunidadevideira/')
    expect(links).toContain('https://www.youtube.com/user/VideiraTV')
    expect(links).toContain('https://wa.me/5575981535971')
  })
})
