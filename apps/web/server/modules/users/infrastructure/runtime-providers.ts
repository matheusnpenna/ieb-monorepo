import type { UserClock } from '../application/ports'

export class SystemUserClock implements UserClock {
  now() {
    return new Date().toISOString()
  }
}
