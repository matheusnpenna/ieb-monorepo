import type { ClassroomClock, ClassroomIdGenerator } from '../application/ports'

export class SystemClassroomClock implements ClassroomClock {
  now() {
    return new Date().toISOString()
  }
}

export class NodeClassroomIdGenerator implements ClassroomIdGenerator {
  create() {
    return crypto.randomUUID()
  }
}
