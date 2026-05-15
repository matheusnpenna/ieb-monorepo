import type { AuthSessionContext } from '@ieb/shared'
import type { AdminLogInput, AdminLogPort } from '../application/ports'
import { writeAdminLog } from '../../../utils/auth'

export class LegacyAdminLogAdapter implements AdminLogPort {
  async write(session: AuthSessionContext, input: AdminLogInput) {
    await writeAdminLog(session, input)
  }
}
