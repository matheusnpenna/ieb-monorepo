import type { AdminLogPort } from '../application/ports'
import { writeAdminLog } from '../../../utils/auth'

export class LegacyAdminLogAdapter implements AdminLogPort {
  async write(...parameters: Parameters<AdminLogPort['write']>) {
    await writeAdminLog(...parameters)
  }
}
