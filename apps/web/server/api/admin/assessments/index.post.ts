import { defineEventHandler } from 'h3'
import { handleCreateAdminAssessment } from '../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleCreateAdminAssessment)
