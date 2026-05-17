import { defineEventHandler } from 'h3'
import { handleUploadAccountAvatar } from '../../../modules/assets/interfaces/http/controller'

export default defineEventHandler(handleUploadAccountAvatar)
