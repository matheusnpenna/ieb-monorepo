import { AssetsService } from './application/assets.service'
import { LegacyAdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseAssetStorage } from './infrastructure/firebase-asset-storage'
import { NodeAssetIdGenerator, SystemAssetClock } from './infrastructure/runtime-providers'

interface AssetsModule {
  service: AssetsService
  adminLog: LegacyAdminLogAdapter
}

let moduleInstance: AssetsModule | null = null

export const getAssetsModule = (): AssetsModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  const adminLog = new LegacyAdminLogAdapter()

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
