declare module 'pdfjs-dist/build/pdf.mjs' {
  export interface PdfViewport {
    width: number
    height: number
  }

  export interface PdfRenderTask {
    promise: Promise<unknown>
    cancel: () => void
  }

  export interface PdfPageProxy {
    getViewport(input: { scale: number }): PdfViewport
    render(input: {
      canvasContext: CanvasRenderingContext2D
      viewport: PdfViewport
    }): PdfRenderTask
  }

  export interface PdfDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PdfPageProxy>
    destroy(): Promise<void>
  }

  export interface PdfDocumentLoadingTask {
    promise: Promise<PdfDocumentProxy>
  }

  export const GlobalWorkerOptions: {
    workerSrc: string
  }

  export function getDocument(src: string): PdfDocumentLoadingTask
}
