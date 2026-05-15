import { defineEventHandler } from 'h3'
import { handleGetAdminAssessment } from '../../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleGetAdminAssessment)
