import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import CourseGrid from './CourseGrid.vue'

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

describe('CourseGrid', () => {
  it('renders the course link to the course detail page', () => {
    const wrapper = mount(CourseGrid, {
      props: {
        items: [
          {
            id: 'course-1',
            title: 'Fundamentos da Videira',
            slug: 'fundamentos-da-videira',
            shortDescription: 'Curso introdutorio com trilha principal e modulos sequenciais.',
            coverImageUrl: 'https://example.com/course-cover.jpg',
            meta: '8 modulos'
          }
        ]
      },
      global: {
        components: {
          NuxtLink: NuxtLinkStub
        }
      }
    })

    expect(wrapper.get('a').attributes('href')).toBe('/curso/fundamentos-da-videira')
    expect(wrapper.text()).toContain('8 modulos')
    expect(wrapper.text()).toContain('Fundamentos da Videira')
  })

  it('uses the svg fallback when the course has no cover image', () => {
    const wrapper = mount(CourseGrid, {
      props: {
        items: [
          {
            id: 'course-1',
            title: 'Formacao Ministerial',
            slug: 'formacao-ministerial',
            shortDescription: 'Curso placeholder para a vitrine da home.',
            coverImageUrl: null,
            meta: 'Em breve'
          }
        ]
      },
      global: {
        components: {
          NuxtLink: NuxtLinkStub
        }
      }
    })

    expect(wrapper.get('img').attributes('src')).toContain('videira-logo.svg')
  })
})
