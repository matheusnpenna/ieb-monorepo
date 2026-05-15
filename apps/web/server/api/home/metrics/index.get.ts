import { defineEventHandler } from 'h3'
import { handleGetHomeMetrics } from '../../../modules/courses/interfaces/http/controller'

export default defineEventHandler(handleGetHomeMetrics)
