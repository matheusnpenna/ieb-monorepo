import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PdfViewer from './PdfViewer.vue'

const { getDocument, getPage, renderPage, destroyDocument } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  getPage: vi.fn(),
  renderPage: vi.fn(),
  destroyDocument: vi.fn()
}))

vi.mock('pdfjs-dist/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  getDocument
}))

const buildPdfDocument = (totalPages = 5) => ({
  numPages: totalPages,
  getPage,
  destroy: destroyDocument
})

describe('PdfViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    getPage.mockResolvedValue({
      getViewport: () => ({
        width: 640,
        height: 920
      }),
      render: renderPage
    })
    renderPage.mockReturnValue({
      promise: Promise.resolve(),
      cancel: vi.fn()
    })
    getDocument.mockReturnValue({
      promise: Promise.resolve(buildPdfDocument())
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      setTransform: vi.fn()
    } as unknown as CanvasRenderingContext2D)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('loads and renders the initial page', async () => {
    const wrapper = mount(PdfViewer, {
      props: {
        src: '/aula.pdf',
        initialPage: 2,
        pageProgressDebounceMs: 0
      }
    })

    await flushPromises()
    await flushPromises()
    vi.runOnlyPendingTimers()

    expect(getDocument).toHaveBeenCalledWith('/aula.pdf')
    expect(getPage).toHaveBeenCalledWith(2)
    expect(renderPage).toHaveBeenCalled()
    expect(wrapper.emitted('loaded')).toEqual([[{ totalPages: 5 }]])
    expect(wrapper.emitted('reading-progress')).toEqual([
      [
        {
          currentPage: 2,
          totalPages: 5,
          percentage: 40
        }
      ]
    ])
  })

  it('changes pages through pagination controls', async () => {
    const wrapper = mount(PdfViewer, {
      props: {
        src: '/aula.pdf',
        pageProgressDebounceMs: 0
      }
    })

    await flushPromises()
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === 'Proxima')?.trigger('click')
    await flushPromises()

    expect(getPage).toHaveBeenLastCalledWith(2)
    expect(wrapper.emitted('page-change')).toEqual([
      [
        {
          currentPage: 2,
          totalPages: 5,
          percentage: 40
        }
      ]
    ])
  })

  it('changes zoom through zoom controls', async () => {
    const wrapper = mount(PdfViewer, {
      props: {
        src: '/aula.pdf'
      }
    })

    await flushPromises()
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text() === '+')?.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('scale-change')).toEqual([[1.25]])
    expect(renderPage).toHaveBeenCalledTimes(2)
  })
})
