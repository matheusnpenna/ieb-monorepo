import { defineEventHandler } from 'h3'
import { handleUpdateAdminAssessment } from '../../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminAssessment)
