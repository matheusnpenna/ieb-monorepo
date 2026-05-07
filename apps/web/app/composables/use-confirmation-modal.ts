import { computed, readonly, ref } from 'vue'
import { getRequestErrorMessage } from '../lib/utils'

export interface ConfirmationModalAction {
  id: string
  label: string
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  keepOpenOnSuccess?: boolean
  errorMessage?: string
  onClick?: () => void | Promise<void>
}

export interface ConfirmationModalOptions {
  title: string
  message: string
  actions: ConfirmationModalAction[]
  dismissible?: boolean
}

const isOpenState = ref(false)
const titleState = ref('')
const messageState = ref('')
const actionsState = ref<ConfirmationModalAction[]>([])
const dismissibleState = ref(true)
const busyActionIdState = ref<string | null>(null)
const feedbackMessageState = ref('')

const resetModalState = () => {
  isOpenState.value = false
  titleState.value = ''
  messageState.value = ''
  actionsState.value = []
  dismissibleState.value = true
  busyActionIdState.value = null
  feedbackMessageState.value = ''
}

const openConfirmationModal = (options: ConfirmationModalOptions) => {
  titleState.value = options.title.trim()
  messageState.value = options.message.trim()
  actionsState.value = options.actions
  dismissibleState.value = options.dismissible ?? true
  busyActionIdState.value = null
  feedbackMessageState.value = ''
  isOpenState.value = true
}

const closeConfirmationModal = () => {
  if (busyActionIdState.value) {
    return
  }

  resetModalState()
}

const runConfirmationAction = async (actionId: string) => {
  const action = actionsState.value.find((item) => item.id === actionId)

  if (!action || action.disabled || busyActionIdState.value) {
    return
  }

  busyActionIdState.value = action.id
  feedbackMessageState.value = ''

  try {
    await action.onClick?.()

    if (!action.keepOpenOnSuccess) {
      resetModalState()
    }
  } catch (error) {
    feedbackMessageState.value = getRequestErrorMessage(
      error,
      action.errorMessage || 'Nao foi possivel concluir a acao.'
    )
  } finally {
    busyActionIdState.value = null
  }
}

export const useConfirmationModal = () => ({
  isOpen: readonly(isOpenState),
  title: readonly(titleState),
  message: readonly(messageState),
  actions: readonly(actionsState),
  dismissible: readonly(dismissibleState),
  busyActionId: readonly(busyActionIdState),
  feedbackMessage: readonly(feedbackMessageState),
  hasActions: computed(() => actionsState.value.length > 0),
  openConfirmationModal,
  closeConfirmationModal,
  runConfirmationAction
})
