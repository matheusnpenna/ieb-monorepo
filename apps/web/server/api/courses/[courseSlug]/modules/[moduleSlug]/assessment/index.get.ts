import { defineEventHandler } from 'h3'
import { handleGetAccessibleModuleAssessments } from '../../../../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleGetAccessibleModuleAssessments)
