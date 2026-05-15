import type { AuthClock } from '../application/ports'

export class SystemAuthClock implements AuthClock {
  now() {
    return new Date().toISOString()
  }
}
