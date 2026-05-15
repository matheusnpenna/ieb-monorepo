import { AssetsService } from './application/assets.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseAssetStorage } from './infrastructure/firebase-asset-storage'
import { NodeAssetIdGenerator, SystemAssetClock } from './infrastructure/runtime-providers'

interface AssetsModule {
  service: AssetsService
  adminLog: AdminLogAdapter
}

let moduleInstance: AssetsModule | null = null

export const getAssetsModule = (): AssetsModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  const adminLog = new AdminLogAdapter()

  moduleInstance = {
    adminLog,
    service: new AssetsService({
      storage: new FirebaseAssetStorage(),
      adminLog,
      clock: new SystemAssetClock(),
      idGenerator: new NodeAssetIdGenerator()
    })
  }

  return moduleInstance
}
