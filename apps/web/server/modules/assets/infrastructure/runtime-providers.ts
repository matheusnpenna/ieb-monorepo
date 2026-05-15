import { randomUUID } from 'node:crypto'
import type { AssetClock, AssetIdGenerator } from '../application/ports'

export class SystemAssetClock implements AssetClock {
  today() {
    return new Date().toISOString().slice(0, 10)
  }
}

export class NodeAssetIdGenerator implements AssetIdGenerator {
  create() {
    return randomUUID()
  }
}
