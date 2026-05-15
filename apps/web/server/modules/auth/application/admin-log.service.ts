import type { AuthSessionContext } from '@ieb/shared'
import type { AdminLogRepository, WriteAdminLogInput } from './ports'

interface AdminLogServiceDependencies {
  repository: AdminLogRepository
}

export class AdminLogService {
  private readonly repository: AdminLogRepository

  constructor(dependencies: AdminLogServiceDependencies) {
    this.repository = dependencies.repository
  }

  async write(session: AuthSessionContext, input: WriteAdminLogInput, summary?: string) {
    if (session.user.role !== 'admin') {
      return
    }

    await this.repository.write(session, input, summary)
  }
}
