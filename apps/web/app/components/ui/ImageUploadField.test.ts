import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImageUploadField from './ImageUploadField.vue'

describe('ImageUploadField', () => {
  it('renders label, hint and file input', () => {
    const wrapper = mount(ImageUploadField, {
      props: {
        label: 'Enviar avatar',
        hint: 'Envie uma imagem.',
        buttonLabel: 'Enviar avatar'
      }
    })

    expect(wrapper.text()).toContain('Enviar avatar')
    expect(wrapper.text()).toContain('Envie uma imagem.')
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('image/*')
  })

  it('emits select and upload events', async () => {
    const wrapper = mount(ImageUploadField, {
      props: {
        label: 'Enviar capa',
        hint: 'Selecione uma imagem.',
        buttonLabel: 'Enviar capa'
      }
    })

    await wrapper.get('input[type="file"]').trigger('change')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('upload')).toHaveLength(1)
  })

  it('disables the file input independently from the upload button', () => {
    const wrapper = mount(ImageUploadField, {
      props: {
        label: 'Enviar hero',
        hint: 'Selecione uma imagem.',
        buttonLabel: 'Enviar hero',
        disabled: true,
        inputDisabled: true
      }
    })

    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
