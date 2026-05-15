import { ClassroomsService } from './application/classrooms.service'
import { AdminLogAdapter } from './infrastructure/admin-log.adapter'
import { FirebaseClassroomRepository } from './infrastructure/firebase-classroom.repository'
import { FirebaseClassroomCourseRepository } from './infrastructure/firebase-course.repository'
import { NodeClassroomIdGenerator, SystemClassroomClock } from './infrastructure/runtime-providers'

interface ClassroomsModule {
  service: ClassroomsService
  adminLog: AdminLogAdapter
}

let moduleInstance: ClassroomsModule | null = null

export const getClassroomsModule = (): ClassroomsModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  const adminLog = new AdminLogAdapter()

  moduleInstance = {
    adminLog,
    service: new ClassroomsService({
      repository: new FirebaseClassroomRepository(),
      courseRepository: new FirebaseClassroomCourseRepository(),
      adminLog,
      clock: new SystemClassroomClock(),
      idGenerator: new NodeClassroomIdGenerator()
    })
  }

  return moduleInstance
}
