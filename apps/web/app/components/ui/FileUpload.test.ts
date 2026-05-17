import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FileUpload from './FileUpload.vue'

describe('FileUpload', () => {
  it('renders label, hint and configured accept attribute', () => {
    const wrapper = mount(FileUpload, {
      props: {
        label: 'Enviar PDF',
        hint: 'Selecione um PDF.',
        buttonLabel: 'Enviar PDF',
        accept: 'application/pdf'
      }
    })

    expect(wrapper.text()).toContain('Enviar PDF')
    expect(wrapper.text()).toContain('Selecione um PDF.')
    expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('application/pdf')
  })

  it('emits select and upload events', async () => {
    const wrapper = mount(FileUpload, {
      props: {
        label: 'Enviar audio',
        hint: 'Selecione um audio.',
        buttonLabel: 'Enviar audio',
        accept: 'audio/*'
      }
    })

    await wrapper.get('input[type="file"]').trigger('change')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('upload')).toHaveLength(1)
  })

  it('rejects files above the configured file size limit', async () => {
    const wrapper = mount(FileUpload, {
      props: {
        label: 'Enviar PDF',
        hint: 'Selecione um PDF.',
        buttonLabel: 'Enviar PDF',
        accept: 'application/pdf',
        fileSizeLimit: 3
      }
    })
    const input = wrapper.get('input[type="file"]').element as HTMLInputElement
    const oversizedFile = new File(['apostila'], 'apostila.pdf', { type: 'application/pdf' })

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [oversizedFile]
    })

    await wrapper.get('input[type="file"]').trigger('change')

    expect(wrapper.text()).toContain('O arquivo precisa ter ate 1 KB.')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
