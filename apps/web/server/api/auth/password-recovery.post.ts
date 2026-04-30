import { readBody } from 'h3'
import { sendPasswordRecoveryEmail } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string }>(event)

  await sendPasswordRecoveryEmail(body?.email || '')

  return {
    message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperacao em instantes.'
  }
})
