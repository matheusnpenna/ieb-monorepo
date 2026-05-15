import type { AdminHighlightInput } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { assertAdminHighlightPayload } from '../../../server/modules/highlights/domain/validation'

const buildInput = (overrides: Partial<AdminHighlightInput> = {}): AdminHighlightInput => ({
  title: 'Aviso',
  description: 'Descricao',
  isActive: true,
  mediaType: null,
  mediaUrl: null,
  actions: [],
  order: 1,
  ...overrides
})

const idGenerator = {
  create: vi.fn(() => 'generated-action-id')
}

describe('highlights validation', () => {
  it.each([
    {
      input: buildInput({ title: ' ' }),
      message: 'Informe o titulo do destaque.'
    },
    {
      input: buildInput({ description: ' ' }),
      message: 'Informe a descricao do destaque.'
    },
    {
      input: buildInput({ mediaType: 'embed' as never }),
      message: 'Informe um tipo de midia valido para o destaque.'
    },
    {
      input: buildInput({ mediaType: 'image', mediaUrl: null }),
      message: 'Informe a URL da midia do destaque.'
    },
    {
      input: buildInput({ mediaType: null, mediaUrl: 'https://example.com/image.jpg' }),
      message: 'Selecione o tipo da midia antes de informar a URL.'
    },
    {
      input: buildInput({ order: -1 }),
      message: 'Informe uma ordem valida para o destaque.'
    },
    {
      input: buildInput({
        actions: [{ id: 'action-1', label: ' ', href: '/home', target: '_self', variant: 'primary' }]
      }),
      message: 'Informe o texto do botao 1.'
    },
    {
      input: buildInput({
        actions: [{ id: 'action-1', label: 'Abrir', href: ' ', target: '_self', variant: 'primary' }]
      }),
      message: 'Informe o link do botao 1.'
    },
    {
      input: buildInput({
        actions: [{ id: 'action-1', label: 'Abrir', href: '/home', target: '_parent' as never, variant: 'primary' }]
      }),
      message: 'Informe um target valido para o botao 1.'
    },
    {
      input: buildInput({
        actions: [{ id: 'action-1', label: 'Abrir', href: '/home', target: '_self', variant: 'danger' as never }]
      }),
      message: 'Informe um estilo valido para o botao 1.'
    }
  ])('returns the expected validation message: $message', ({ input, message }) => {
    expect(() => assertAdminHighlightPayload(input, idGenerator)).toThrow(message)
  })

  it('normalizes text and generates missing action ids', () => {
    const result = assertAdminHighlightPayload(
      buildInput({
        title: ' Aviso ',
        description: ' Descricao ',
        actions: [{ id: ' ', label: ' Abrir ', href: ' /home ', target: '_self', variant: 'primary' }]
      }),
      idGenerator
    )

    expect(result).toEqual({
      title: 'Aviso',
      description: 'Descricao',
      mediaType: null,
      mediaUrl: null,
      actions: [{ id: 'generated-action-id', label: 'Abrir', href: '/home', target: '_self', variant: 'primary' }]
    })
  })
})
