import { CoursesService } from './application/courses.service'
import { LegacyCoursesAdapter } from './infrastructure/legacy-courses.adapter'

interface CoursesModule {
  service: CoursesService
}

let moduleInstance: CoursesModule | null = null

export const getCoursesModule = (): CoursesModule => {
  if (moduleInstance) {
    return moduleInstance
  }

  moduleInstance = {
    service: new CoursesService({
      backend: new LegacyCoursesAdapter()
    })
  }

  return moduleInstance
}
