import { LogsService } from './application/logs.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseLogRepository } from './infrastructure/firebase-log.repository'

interface LogsModule {
  service: LogsService
  adminLog: AdminLogAdapter
}

let moduleInstance: LogsModule | null = null

export const getLogsModule = (): LogsModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  moduleInstance = {
    adminLog: new AdminLogAdapter(),
    service: new LogsService({
      repository: new FirebaseLogRepository()
    })
  }

  return moduleInstance
}
