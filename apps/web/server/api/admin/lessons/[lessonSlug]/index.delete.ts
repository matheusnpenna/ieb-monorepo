import { defineEventHandler } from 'h3'
import { handleDeleteAdminLesson } from '../../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleDeleteAdminLesson)
