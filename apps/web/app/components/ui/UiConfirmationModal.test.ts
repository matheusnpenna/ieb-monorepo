import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import UiConfirmationModal from './UiConfirmationModal.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'

describe('UiConfirmationModal', () => {
  const modal = useConfirmationModal()

  beforeEach(() => {
    modal.closeConfirmationModal()
    document.body.style.overflow = ''
  })

  afterEach(() => {
    modal.closeConfirmationModal()
    document.body.style.overflow = ''
  })

  it('renders the modal content when opened through the composable', async () => {
    const wrapper = mount(UiConfirmationModal, {
      global: {
        stubs: {
          Teleport: true
        }
      }
    })

    modal.openConfirmationModal({
      title: 'Excluir comentario',
      message: 'Deseja realmente remover este comentario?',
      actions: [
        {
          id: 'cancel',
          label: 'Cancelar',
          variant: 'secondary'
        }
      ]
    })

    await nextTick()

    expect(wrapper.text()).toContain('Excluir comentario')
    expect(wrapper.text()).toContain('Deseja realmente remover este comentario?')
    expect(wrapper.text()).toContain('Cancelar')
  })

  it('executes the configured action and closes the modal after success', async () => {
    const wrapper = mount(UiConfirmationModal, {
      global: {
        stubs: {
          Teleport: true
        }
      }
    })
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    modal.openConfirmationModal({
      title: 'Confirmar saida',
      message: 'Deseja sair?',
      actions: [
        {
          id: 'confirm',
          label: 'Sair',
          onClick: onConfirm
        }
      ]
    })

    await nextTick()
    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(modal.isOpen.value).toBe(false)
  })
})
