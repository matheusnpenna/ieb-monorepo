import { defineEventHandler } from 'h3'
import { handleUploadAdminLessonFile } from '../../../../modules/assets/interfaces/http/controller'

export default defineEventHandler(handleUploadAdminLessonFile)
