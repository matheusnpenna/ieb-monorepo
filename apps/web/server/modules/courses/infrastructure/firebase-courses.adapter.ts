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
} from './firebase-courses.repository'

export class FirebaseCoursesAdapter implements CoursesBackendPort {
  listAccessibleCourses = listAccessibleCourses
  getAccessibleCourseDetailBySlug = getAccessibleCourseDetailBySlug
  getHomeMetrics = getHomeMetrics
  listAdminCoursesForManagement = listAdminCoursesForManagement
  getAdminCourseBySlug = getAdminCourseBySlug
  createAdminCourse = createAdminCourse
  updateAdminCourseBySlug = updateAdminCourseBySlug
  deleteAdminCourseBySlug = deleteAdminCourseBySlug
}
