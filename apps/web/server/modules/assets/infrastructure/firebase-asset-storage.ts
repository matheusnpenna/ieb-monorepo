import type { AssetStorage } from '../application/ports'
import { getFirebaseAdminBucket } from '../../../utils/firebase-admin'

export class FirebaseAssetStorage implements AssetStorage {
  async savePublicObject(input: {
    objectPath: string
    data: Uint8Array
    contentType: string
    metadata: Record<string, string>
  }) {
    const bucket = getFirebaseAdminBucket()
    const file = bucket.file(input.objectPath)

    await file.save(Buffer.from(input.data), {
      metadata: {
        contentType: input.contentType,
        metadata: input.metadata
      }
    })
    await file.makePublic()

    return {
      bucketName: bucket.name
    }
  }
}
