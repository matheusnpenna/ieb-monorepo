<script setup lang="ts">
import type {
  AdminHighlightActionInput,
  AdminHighlightInput,
  AdminHighlightResponse,
  ButtonVariant,
  HighlightActionTarget,
  HighlightMediaType
} from '@ieb/shared'
import PageIntro from '../base/PageIntro.vue'
import SurfaceCard from '../base/SurfaceCard.vue'
import UiButton from '../ui/UiButton.vue'
import UiField from '../ui/UiField.vue'
import UiInput from '../ui/UiInput.vue'
import UiSelect from '../ui/UiSelect.vue'
import UiSpinner from '../ui/UiSpinner.vue'
import UiTextarea from '../ui/UiTextarea.vue'
import { useConfirmationModal } from '../../composables/use-confirmation-modal'
import { getRequestErrorMessage } from '../../lib/utils'

type FeedbackTone = 'success' | 'error'

const props = defineProps<{
  mode: 'create' | 'edit'
  highlightId?: string
}>()

const route = useRoute()
const { openConfirmationModal } = useConfirmationModal()

const mediaTypeOptions: Array<{ value: HighlightMediaType | 'none'; label: string }> = [
  { value: 'none', label: 'Sem midia' },
  { value: 'image', label: 'Imagem' },
  { value: 'video', label: 'Video' }
]

const targetOptions: Array<{ value: HighlightActionTarget; label: string }> = [
  { value: '_self', label: 'Mesma aba' },
  { value: '_blank', label: 'Nova aba' }
]

const variantOptions: Array<{ value: ButtonVariant; label: string }> = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'success', label: 'Success' }
]

const createEmptyAction = (): AdminHighlightActionInput => ({
  id: crypto.randomUUID(),
  label: '',
  href: '',
  target: '_self',
  variant: 'primary'
})

const buildEmptyHighlightForm = (): AdminHighlightInput => ({
  title: '',
  description: '',
  isActive: false,
  mediaType: null,
  mediaUrl: null,
  actions: [],
  order: 0
})

const defaultHighlightResponse = {
  status: 'success',
  data: null
} satisfies AdminHighlightResponse

const { data: highlightResponse, pending: highlightPending } = await useAsyncData<AdminHighlightResponse>(
  () => `admin-highlight-editor-${props.highlightId || 'new'}`,
  () => {
    if (props.mode !== 'edit' || !props.highlightId) {
      return Promise.resolve(defaultHighlightResponse)
    }

    return $fetch(`/api/admin/highlights/${props.highlightId}`, {
      credentials: 'include',
      ignoreResponseError: true
    })
  },
  {
    default: () => defaultHighlightResponse
  }
)

const highlightForm = ref<AdminHighlightInput>(buildEmptyHighlightForm())
const submitPending = ref(false)
const deletePending = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('success')

const isEditing = computed(() => props.mode === 'edit')
const currentHighlight = computed(() =>
  highlightResponse.value?.status === 'success' ? highlightResponse.value.data : null
)
const pageTitle = computed(() => (isEditing.value ? 'Editar destaque' : 'Novo destaque'))
const pageDescription = computed(() =>
  isEditing.value
    ? 'Atualize o destaque, escolha se ele esta ativo e ajuste a ordem e os botoes. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.'
    : 'Cadastre um novo destaque para aparecer na home dos alunos. Nenhuma alteracao e persistida ate clicar em Salvar alteracoes.'
)
const submitLabel = computed(() => (isEditing.value ? 'Salvar alteracoes' : 'Criar destaque'))
const highlightErrorMessage = computed(() => {
  if (!highlightResponse.value || highlightResponse.value.status !== 'error') {
    return ''
  }

  return highlightResponse.value.messages[0] || 'Nao foi possivel carregar o destaque.'
})
const activeValue = computed({
  get: () => (highlightForm.value.isActive ? 'true' : 'false'),
  set: (value: string) => {
    highlightForm.value.isActive = value === 'true'
  }
})
const mediaTypeValue = computed({
  get: () => highlightForm.value.mediaType || 'none',
  set: (value: HighlightMediaType | 'none') => {
    highlightForm.value.mediaType = value === 'none' ? null : value

    if (value === 'none') {
      highlightForm.value.mediaUrl = null
    }
  }
})

watch(
  currentHighlight,
  (highlight) => {
    if (!highlight) {
      if (!isEditing.value) {
        highlightForm.value = buildEmptyHighlightForm()
      }
      return
    }

    highlightForm.value = {
      title: highlight.title,
      description: highlight.description,
      isActive: highlight.isActive,
      mediaType: highlight.mediaType,
      mediaUrl: highlight.mediaUrl,
      actions: highlight.actions.map((action) => ({ ...action })),
      order: highlight.order
    }
  },
  { immediate: true }
)

watch(
  () => route.query.status,
  (status) => {
    if (status === 'created') {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Destaque criado com sucesso.'
    }
  },
  { immediate: true }
)

const addAction = () => {
  highlightForm.value.actions = [...highlightForm.value.actions, createEmptyAction()]
}

const removeAction = (actionId: string) => {
  highlightForm.value.actions = highlightForm.value.actions.filter((action) => action.id !== actionId)
}

const buildPayload = (): AdminHighlightInput => ({
  title: highlightForm.value.title,
  description: highlightForm.value.description,
  isActive: highlightForm.value.isActive,
  mediaType: highlightForm.value.mediaType,
  mediaUrl: highlightForm.value.mediaUrl?.trim() || null,
  actions: highlightForm.value.actions.map((action) => ({
    id: action.id,
    label: action.label,
    href: action.href,
    target: action.target,
    variant: action.variant
  })),
  order: Number(highlightForm.value.order || 0)
})

const onSubmit = async () => {
  if (submitPending.value) {
    return
  }

  submitPending.value = true
  feedbackMessage.value = ''

  try {
    const response = await $fetch<AdminHighlightResponse>(
      isEditing.value ? `/api/admin/highlights/${props.highlightId}` : '/api/admin/highlights',
      {
        method: isEditing.value ? 'PATCH' : 'POST',
        credentials: 'include',
        body: buildPayload()
      }
    )

    if (response.status !== 'success' || !response.data) {
      throw new Error('Nao foi possivel salvar o destaque.')
    }

    if (isEditing.value) {
      feedbackTone.value = 'success'
      feedbackMessage.value = 'Destaque atualizado com sucesso.'
      highlightResponse.value = {
        status: 'success',
        data: response.data
      }
      return
    }

    await navigateTo(`/admin/destaques/${response.data.id}?status=created`)
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel salvar o destaque.')
  } finally {
    submitPending.value = false
  }
}

const onDeleteConfirmed = async () => {
  if (!props.highlightId || deletePending.value) {
    return
  }

  deletePending.value = true

  try {
    await $fetch<AdminHighlightResponse>(`/api/admin/highlights/${props.highlightId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    await navigateTo('/admin/destaques')
  } catch (error) {
    feedbackTone.value = 'error'
    feedbackMessage.value = getRequestErrorMessage(error, 'Nao foi possivel remover o destaque.')
  } finally {
    deletePending.value = false
  }
}

const onDeleteRequest = () => {
  if (!currentHighlight.value) {
    return
  }

  openConfirmationModal({
    title: 'Excluir destaque',
    message: `Deseja realmente excluir o destaque ${currentHighlight.value.title}? Esta acao sera registrada no painel administrativo.`,
    actions: [
      {
        id: 'cancel',
        label: 'Cancelar',
        variant: 'secondary'
      },
      {
        id: 'delete',
        label: 'Excluir',
        errorMessage: 'Nao foi possivel remover o destaque.',
        onClick: onDeleteConfirmed
      }
    ]
  })
}
</script>

<template>
  <div class="section-stack">
    <PageIntro eyebrow="Destaques" :title="pageTitle" :description="pageDescription" />

    <SurfaceCard>
      <div v-if="highlightPending" class="section-stack">
        <UiSpinner size="lg" label="Carregando destaque do painel">
          <span class="body-copy">Carregando destaque do painel...</span>
        </UiSpinner>
      </div>

      <div v-else-if="highlightErrorMessage" class="section-stack">
        <p class="feedback-message" data-tone="error">{{ highlightErrorMessage }}</p>
        <UiButton to="/admin/destaques" variant="secondary">Voltar para destaques</UiButton>
      </div>

      <form v-else class="section-stack" @submit.prevent="onSubmit">
        <p v-if="feedbackMessage" class="feedback-message" :data-tone="feedbackTone">
          {{ feedbackMessage }}
        </p>

        <UiField label="Titulo" required>
          <UiInput v-model="highlightForm.title" placeholder="Ex.: Aviso importante para todos os alunos" />
        </UiField>

        <UiField label="Descricao" required>
          <UiTextarea
            v-model="highlightForm.description"
            :rows="4"
            placeholder="Descreva a informacao que aparecera no destaque da home."
          />
        </UiField>

        <div class="form-grid highlight-form-grid">
          <UiField label="Destaque ativo" required>
            <UiSelect v-model="activeValue">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </UiSelect>
          </UiField>

          <UiField label="Ordem" required hint="Menores valores aparecem primeiro no carrossel.">
            <UiInput v-model.number="highlightForm.order" type="number" min="0" />
          </UiField>

          <UiField label="Tipo de midia">
            <UiSelect v-model="mediaTypeValue">
              <option v-for="option in mediaTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </UiSelect>
          </UiField>

          <UiField
            label="URL da midia"
            :hint="highlightForm.mediaType === 'video' ? 'Aceita link direto de video, YouTube ou Vimeo.' : 'Opcional.'"
          >
            <UiInput
              v-model="highlightForm.mediaUrl"
              :disabled="!highlightForm.mediaType"
              placeholder="https://..."
            />
          </UiField>
        </div>

        <div class="section-stack">
          <div class="highlight-actions-header">
            <div class="section-stack highlight-actions-copy">
              <h2 class="section-title">Botoes de acao</h2>
              <p class="body-copy">Adicione quantos botoes forem necessarios para orientar os alunos.</p>
            </div>

            <UiButton type="button" variant="secondary" size="sm" @click="addAction">
              Adicionar botao
            </UiButton>
          </div>

          <p v-if="highlightForm.actions.length === 0" class="body-copy">
            Nenhum botao configurado para este destaque.
          </p>

          <div v-else class="action-list">
            <SurfaceCard v-for="(action, index) in highlightForm.actions" :key="action.id" as="article">
              <div class="section-stack action-card">
                <div class="action-card-header">
                  <h3 class="section-title action-card-title">Botao {{ index + 1 }}</h3>
                  <UiButton type="button" variant="ghost" textColor="accent" size="sm" @click="removeAction(action.id)">
                    Remover
                  </UiButton>
                </div>

                <div class="form-grid highlight-form-grid">
                  <UiField label="Texto do botao" required>
                    <UiInput v-model="action.label" placeholder="Ex.: Ver detalhes" />
                  </UiField>

                  <UiField label="Link do botao" required>
                    <UiInput v-model="action.href" placeholder="/curso/teologia-basica" />
                  </UiField>

                  <UiField label="Target" required>
                    <UiSelect v-model="action.target">
                      <option v-for="option in targetOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </UiSelect>
                  </UiField>

                  <UiField label="Estilo do botao" required>
                    <UiSelect v-model="action.variant">
                      <option v-for="option in variantOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </UiSelect>
                  </UiField>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </div>

        <div class="form-actions">
          <UiButton type="submit" variant="success" size="lg" :loading="submitPending">
            {{ submitLabel }}
          </UiButton>
          <UiButton to="/admin/destaques" type="button" variant="ghost" size="lg" :disabled="submitPending || deletePending">
            Voltar para destaques
          </UiButton>
          <UiButton
            v-if="isEditing"
            type="button"
            variant="ghost"
            textColor="accent"
            size="lg"
            :disabled="submitPending || deletePending"
            @click="onDeleteRequest"
          >
            Excluir destaque
          </UiButton>
        </div>
      </form>
    </SurfaceCard>
  </div>
</template>

<style scoped>
.highlight-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.highlight-actions-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.highlight-actions-copy {
  gap: 0.35rem;
}

.action-list {
  display: grid;
  gap: 1rem;
}

.action-card {
  gap: 1rem;
}

.action-card-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
}

.action-card-title {
  font-size: 1.1rem;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .highlight-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
