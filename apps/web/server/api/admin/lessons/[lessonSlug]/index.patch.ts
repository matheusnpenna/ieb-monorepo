import { defineEventHandler } from 'h3'
import { handleUpdateAdminLesson } from '../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminLesson)
