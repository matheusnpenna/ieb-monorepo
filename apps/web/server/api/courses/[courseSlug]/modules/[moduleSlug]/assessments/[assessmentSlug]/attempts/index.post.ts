import { defineEventHandler } from 'h3'
import { handleSubmitAssessmentAttempt } from '../../../../../../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleSubmitAssessmentAttempt)
