import type { CoursesBackendPort } from '../application/ports'
import {
  createAdminCourse,
  deleteAdminCourseBySlug,
  getAccessibleCourseDetailBySlug,
  getAdminCourseBySlug,
  getHomeMetrics,
  listAccessibleCourses,
  listAdminCoursesForManagement,
  updateAdminCourseBySlug
} from '../../../utils/courses'

export class LegacyCoursesAdapter implements CoursesBackendPort {
  listAccessibleCourses = listAccessibleCourses
  getAccessibleCourseDetailBySlug = getAccessibleCourseDetailBySlug
  getHomeMetrics = getHomeMetrics
  listAdminCoursesForManagement = listAdminCoursesForManagement
  getAdminCourseBySlug = getAdminCourseBySlug
  createAdminCourse = createAdminCourse
  updateAdminCourseBySlug = updateAdminCourseBySlug
  deleteAdminCourseBySlug = deleteAdminCourseBySlug
}
