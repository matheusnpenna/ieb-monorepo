import { LogsService } from './application/logs.service'
import { LegacyAdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseLogRepository } from './infrastructure/firebase-log.repository'

interface LogsModule {
  service: LogsService
  adminLog: LegacyAdminLogAdapter
}

let moduleInstance: LogsModule | null = null

export const getLogsModule = (): LogsModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  moduleInstance = {
    adminLog: new LegacyAdminLogAdapter(),
    service: new LogsService({
      repository: new FirebaseLogRepository()
    })
  }

  return moduleInstance
}
