import { randomUUID } from 'node:crypto'
import type { HighlightClock, HighlightIdGenerator } from '../application/ports'

export class SystemHighlightClock implements HighlightClock {
  now() {
    return new Date().toISOString()
  }
}

export class NodeHighlightIdGenerator implements HighlightIdGenerator {
  create() {
    return randomUUID()
  }
}
