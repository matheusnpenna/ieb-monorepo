import type { AuthSessionContext } from '@ieb/shared'
import type { WriteAdminLogInput } from '../../auth/application/ports'
import { writeAdminLog } from '../../auth/interfaces/http/session'

export class SharedAdminLogAdapter {
  async write(session: AuthSessionContext, input: WriteAdminLogInput, summary?: string) {
    await writeAdminLog(session, input, summary)
  }
}
