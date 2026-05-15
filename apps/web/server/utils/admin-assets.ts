import type { AuthSessionContext } from '@ieb/shared'
import type { AdminImageField } from '../modules/assets/domain/validation'
import { getAssetsModule } from '../modules/assets/assets.module'

interface UploadAdminCourseImageInput {
  field: AdminImageField
  filename: string
  mimeType: string
  data: Uint8Array
}

export const uploadAdminCourseImage = async (
  session: AuthSessionContext,
  input: UploadAdminCourseImageInput
) => {
  return await getAssetsModule().service.uploadAdminImage(session, input)
}
