import { HighlightsService } from './application/highlights.service'
import { FirebaseHighlightRepository } from './infrastructure/firebase-highlight.repository'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { NodeHighlightIdGenerator, SystemHighlightClock } from './infrastructure/runtime-providers'

interface HighlightsModule {
  service: HighlightsService
  adminLog: AdminLogAdapter
}

let moduleInstance: HighlightsModule | null = null

export const getHighlightsModule = (): HighlightsModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  const repository = new FirebaseHighlightRepository()
  const adminLog = new AdminLogAdapter()

  moduleInstance = {
    adminLog,
    service: new HighlightsService({
      repository,
      adminLog,
      clock: new SystemHighlightClock(),
      idGenerator: new NodeHighlightIdGenerator()
    })
  }

  return moduleInstance
}
