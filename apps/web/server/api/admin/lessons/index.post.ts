import { defineEventHandler } from 'h3'
import { handleCreateAdminLesson } from '../../../modules/lessons/interfaces/http/controller'

export default defineEventHandler(handleCreateAdminLesson)
