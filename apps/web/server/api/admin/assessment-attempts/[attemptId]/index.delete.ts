import { defineEventHandler } from 'h3'
import { handleDeleteAdminAssessmentAttempt } from '../../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleDeleteAdminAssessmentAttempt)
