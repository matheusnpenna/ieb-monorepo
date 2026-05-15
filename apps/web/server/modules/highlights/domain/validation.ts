import type { AdminHighlightInput } from '@ieb/shared'
import { z } from 'zod'
import { createHighlightError } from './errors'

export interface HighlightIdGenerator {
  create(): string
}

export const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

const highlightActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  target: z.enum(['_self', '_blank']),
  variant: z.enum(['primary', 'secondary', 'ghost', 'success'])
})

const adminHighlightSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    mediaType: z.enum(['image', 'video']).nullable(),
    mediaUrl: z.string().nullable(),
    actions: z.array(highlightActionSchema),
    order: z.number().finite().min(0)
  })
  .superRefine((input, context) => {
    if (!input.title.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['title'],
        message: 'Informe o titulo do destaque.'
      })
    }

    if (!input.description.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['description'],
        message: 'Informe a descricao do destaque.'
      })
    }

    const mediaUrl = normalizeOptionalText(input.mediaUrl)

    if (input.mediaType && !mediaUrl) {
      context.addIssue({
        code: 'custom',
        path: ['mediaUrl'],
        message: 'Informe a URL da midia do destaque.'
      })
    }

    if (!input.mediaType && mediaUrl) {
      context.addIssue({
        code: 'custom',
        path: ['mediaType'],
        message: 'Selecione o tipo da midia antes de informar a URL.'
      })
    }

    input.actions.forEach((action, index) => {
      if (!action.label.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['actions', index, 'label'],
          message: `Informe o texto do botao ${index + 1}.`
        })
      }

      if (!action.href.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['actions', index, 'href'],
          message: `Informe o link do botao ${index + 1}.`
        })
      }
    })
  })

const getAdminHighlightValidationMessage = (error: z.ZodError) => {
  const firstIssue = error.issues[0]

  if (!firstIssue) {
    return 'Informe os dados do destaque corretamente.'
  }

  const [field, actionIndex, actionField] = firstIssue.path

  if (field === 'mediaType') {
    return firstIssue.message === 'Selecione o tipo da midia antes de informar a URL.'
      ? firstIssue.message
      : 'Informe um tipo de midia valido para o destaque.'
  }

  if (field === 'order') {
    return 'Informe uma ordem valida para o destaque.'
  }

  if (field === 'actions' && typeof actionIndex === 'number') {
    if (actionField === 'target') {
      return `Informe um target valido para o botao ${actionIndex + 1}.`
    }

    if (actionField === 'variant') {
      return `Informe um estilo valido para o botao ${actionIndex + 1}.`
    }
  }

  return firstIssue.message
}

export const assertAdminHighlightPayload = (
  input: AdminHighlightInput,
  idGenerator: HighlightIdGenerator
) => {
  const parsedInput = adminHighlightSchema.safeParse(input)

  if (!parsedInput.success) {
    throw createHighlightError(400, getAdminHighlightValidationMessage(parsedInput.error))
  }

  const actions = parsedInput.data.actions.map((action) => ({
    id: action.id.trim() || idGenerator.create(),
    label: action.label.trim(),
    href: action.href.trim(),
    target: action.target,
    variant: action.variant
  }))

  return {
    title: parsedInput.data.title.trim(),
    description: parsedInput.data.description.trim(),
    mediaType: parsedInput.data.mediaType,
    mediaUrl: normalizeOptionalText(parsedInput.data.mediaUrl),
    actions
  }
}
