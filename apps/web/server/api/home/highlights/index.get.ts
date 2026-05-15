import { defineEventHandler } from 'h3'
import { handleListHomeHighlights } from '../../../modules/highlights/interfaces/http/controller'

export default defineEventHandler(handleListHomeHighlights)
