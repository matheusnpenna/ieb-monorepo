import type { AdminLogPort } from '../application/ports'
import { SharedAdminLogAdapter } from '../../shared/infrastructure/admin-log.adapter'

export class AdminLogAdapter extends SharedAdminLogAdapter implements AdminLogPort {}
