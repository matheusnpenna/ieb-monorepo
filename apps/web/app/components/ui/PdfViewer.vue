<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import UiButton from './UiButton.vue'
import UiInput from './UiInput.vue'
import UiPanel from './UiPanel.vue'
import UiSpinner from './UiSpinner.vue'

type PdfJsModule = typeof import('pdfjs-dist/build/pdf.mjs')
type PdfDocumentLoadingTask = ReturnType<PdfJsModule['getDocument']>
type PdfDocumentProxy = Awaited<PdfDocumentLoadingTask['promise']>
type PdfRenderTask = {
  promise: Promise<unknown>
  cancel: () => void
}

export interface PdfViewerReadingProgress {
  currentPage: number
  totalPages: number
  percentage: number
}

const props = withDefaults(
  defineProps<{
    src: string
    initialPage?: number
    initialScale?: number
    minScale?: number
    maxScale?: number
    pageProgressDebounceMs?: number
  }>(),
  {
    initialPage: 1,
    initialScale: 1,
    minScale: 0.75,
    maxScale: 2.5,
    pageProgressDebounceMs: 500
  }
)

const emit = defineEmits<{
  loaded: [payload: { totalPages: number }]
  error: [payload: { message: string }]
  'page-change': [payload: PdfViewerReadingProgress]
  'scale-change': [scale: number]
  'reading-progress': [payload: PdfViewerReadingProgress]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const pdfDocument = ref<PdfDocumentProxy | null>(null)
const renderTask = ref<PdfRenderTask | null>(null)
const loading = ref(false)
const rendering = ref(false)
const errorMessage = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(props.initialScale)
const pageInputValue = ref(String(props.initialPage))
let progressTimeout: ReturnType<typeof setTimeout> | null = null
let loadToken = 0

const canRender = computed(() => Boolean(props.src && pdfDocument.value && totalPages.value > 0))
const isFirstPage = computed(() => currentPage.value <= 1)
const isLastPage = computed(() => currentPage.value >= totalPages.value)
const scaleLabel = computed(() => `${Math.round(scale.value * 100)}%`)
const progressPercentage = computed(() => {
  if (!totalPages.value) {
    return 0
  }

  return Math.round((currentPage.value / totalPages.value) * 100)
})

const clampPage = (page: number) => {
  const fallbackTotal = totalPages.value || 1

  if (!Number.isFinite(page)) {
    return 1
  }

  return Math.min(Math.max(1, Math.trunc(page)), fallbackTotal)
}

const clampScale = (nextScale: number) =>
  Math.min(Math.max(nextScale, props.minScale), props.maxScale)

const buildProgress = (): PdfViewerReadingProgress => ({
  currentPage: currentPage.value,
  totalPages: totalPages.value,
  percentage: progressPercentage.value
})

const emitReadingProgress = () => {
  if (!totalPages.value) {
    return
  }

  if (progressTimeout) {
    clearTimeout(progressTimeout)
  }

  progressTimeout = setTimeout(() => {
    emit('reading-progress', buildProgress())
  }, props.pageProgressDebounceMs)
}

const cancelRenderTask = () => {
  if (!renderTask.value) {
    return
  }

  renderTask.value.cancel()
  renderTask.value = null
}

const destroyDocument = async () => {
  cancelRenderTask()

  if (pdfDocument.value) {
    await pdfDocument.value.destroy()
    pdfDocument.value = null
  }
}

const renderCurrentPage = async () => {
  if (!canRender.value || !canvasRef.value || !pdfDocument.value) {
    return
  }

  cancelRenderTask()
  rendering.value = true
  errorMessage.value = ''

  try {
    const page = await pdfDocument.value.getPage(currentPage.value)
    const viewport = page.getViewport({ scale: scale.value })
    const canvas = canvasRef.value
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Nao foi possivel preparar a renderizacao do PDF.')
    }

    const pixelRatio = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * pixelRatio)
    canvas.height = Math.floor(viewport.height * pixelRatio)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    const task = page.render({
      canvasContext: context,
      viewport
    }) as PdfRenderTask

    renderTask.value = task
    await task.promise
    renderTask.value = null
    emitReadingProgress()
  } catch (error) {
    const renderError = error as { name?: string; message?: string }

    if (renderError.name === 'RenderingCancelledException') {
      return
    }

    errorMessage.value = renderError.message || 'Nao foi possivel renderizar esta pagina do PDF.'
    emit('error', { message: errorMessage.value })
  } finally {
    rendering.value = false
  }
}

const loadDocument = async () => {
  const token = (loadToken += 1)

  loading.value = true
  rendering.value = false
  errorMessage.value = ''
  totalPages.value = 0
  currentPage.value = 1
  pageInputValue.value = '1'

  try {
    await destroyDocument()

    if (!props.src) {
      throw new Error('Informe a URL do PDF para visualizacao.')
    }

    const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()
    const loadingTask = pdfjs.getDocument(props.src)
    const documentProxy = await loadingTask.promise

    if (token !== loadToken) {
      await documentProxy.destroy()
      return
    }

    pdfDocument.value = documentProxy
    totalPages.value = documentProxy.numPages
    currentPage.value = clampPage(props.initialPage)
    pageInputValue.value = String(currentPage.value)
    scale.value = clampScale(props.initialScale)

    emit('loaded', { totalPages: totalPages.value })
    await nextTick()
    await renderCurrentPage()
  } catch (error) {
    const loadError = error as { message?: string }
    errorMessage.value = loadError.message || 'Nao foi possivel carregar o PDF.'
    emit('error', { message: errorMessage.value })
  } finally {
    if (token === loadToken) {
      loading.value = false
    }
  }
}

const setCurrentPage = async (page: number) => {
  const nextPage = clampPage(page)

  if (nextPage === currentPage.value) {
    pageInputValue.value = String(currentPage.value)
    return
  }

  currentPage.value = nextPage
  pageInputValue.value = String(nextPage)
  emit('page-change', buildProgress())
  await renderCurrentPage()
}

const goToPreviousPage = () => setCurrentPage(currentPage.value - 1)
const goToNextPage = () => setCurrentPage(currentPage.value + 1)

const onPageInputCommit = () => {
  setCurrentPage(Number(pageInputValue.value))
}

const setScale = async (nextScale: number) => {
  const normalizedScale = clampScale(nextScale)

  if (normalizedScale === scale.value) {
    return
  }

  scale.value = normalizedScale
  emit('scale-change', scale.value)
  await renderCurrentPage()
}

const zoomOut = () => setScale(Number((scale.value - 0.25).toFixed(2)))
const zoomIn = () => setScale(Number((scale.value + 0.25).toFixed(2)))
const resetZoom = () => setScale(1)

watch(
  () => props.src,
  () => {
    loadDocument()
  },
  { immediate: true }
)

watch(
  () => props.initialPage,
  (nextPage) => {
    if (!pdfDocument.value) {
      return
    }

    setCurrentPage(nextPage)
  }
)

onBeforeUnmount(() => {
  loadToken += 1

  if (progressTimeout) {
    clearTimeout(progressTimeout)
  }

  destroyDocument()
})
</script>

<template>
  <UiPanel class="pdf-viewer" tone="strong">
    <div class="pdf-toolbar">
      <div class="toolbar-group">
        <UiButton
          type="button"
          variant="secondary"
          size="sm"
          :disabled="loading || rendering || isFirstPage"
          aria-label="Pagina anterior"
          @click="goToPreviousPage"
        >
          Anterior
        </UiButton>

        <div class="page-control">
          <UiInput
            v-model="pageInputValue"
            type="number"
            min="1"
            :max="totalPages || 1"
            :disabled="loading || !totalPages"
            aria-label="Pagina atual"
            @keydown.enter.prevent="onPageInputCommit"
            @blur="onPageInputCommit"
          />
          <span>de {{ totalPages || '-' }}</span>
        </div>

        <UiButton
          type="button"
          variant="secondary"
          size="sm"
          :disabled="loading || rendering || isLastPage"
          aria-label="Proxima pagina"
          @click="goToNextPage"
        >
          Proxima
        </UiButton>
      </div>

      <div class="toolbar-group">
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          :disabled="loading || rendering || scale <= minScale"
          aria-label="Diminuir zoom"
          @click="zoomOut"
        >
          -
        </UiButton>
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          :disabled="loading || rendering"
          aria-label="Redefinir zoom"
          @click="resetZoom"
        >
          {{ scaleLabel }}
        </UiButton>
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          :disabled="loading || rendering || scale >= maxScale"
          aria-label="Aumentar zoom"
          @click="zoomIn"
        >
          +
        </UiButton>
      </div>
    </div>

    <div class="progress-track" aria-hidden="true">
      <span :style="{ width: `${progressPercentage}%` }" />
    </div>

    <div class="pdf-stage" :aria-busy="loading || rendering ? 'true' : undefined">
      <div v-if="loading" class="pdf-state">
        <UiSpinner label="Carregando PDF" />
      </div>

      <div v-else-if="errorMessage" class="pdf-state">
        <p class="feedback-message" data-tone="error">{{ errorMessage }}</p>
      </div>

      <canvas
        v-show="!loading && !errorMessage"
        ref="canvasRef"
        class="pdf-canvas"
      />
    </div>
  </UiPanel>
</template>

<style scoped>
.pdf-viewer {
  display: grid;
  gap: 1rem;
  overflow: hidden;
}

.pdf-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.page-control {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--ds-muted);
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
}

.page-control :deep(input) {
  width: 5.25rem;
  height: 2.5rem;
  padding-inline: 0.8rem;
  text-align: center;
}

.progress-track {
  height: 0.25rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ds-accent), var(--ds-accent-strong));
  transition: width 180ms ease;
}

.pdf-stage {
  display: grid;
  place-items: start center;
  min-height: 34rem;
  max-height: min(76vh, 54rem);
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background:
    radial-gradient(circle at top, rgba(229, 9, 20, 0.08), transparent 28%),
    rgba(0, 0, 0, 0.28);
  padding: 1rem;
}

.pdf-state {
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 26rem;
  text-align: center;
}

.pdf-canvas {
  display: block;
  max-width: none;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
}

@media (max-width: 720px) {
  .pdf-toolbar,
  .toolbar-group {
    align-items: stretch;
    width: 100%;
  }

  .toolbar-group > * {
    flex: 1 1 auto;
  }

  .page-control {
    justify-content: center;
  }

  .pdf-stage {
    min-height: 28rem;
    padding: 0.75rem;
  }
}
</style>
