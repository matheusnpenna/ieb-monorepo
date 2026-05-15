import { defineEventHandler } from 'h3'
import { handleListAdminLessons } from '../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleListAdminLessons)
