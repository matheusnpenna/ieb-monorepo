import { defineEventHandler } from 'h3'
import { handleDeleteAdminAssessment } from '../../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleDeleteAdminAssessment)
