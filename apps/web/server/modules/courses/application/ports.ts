import type {
  AdminCourseInput,
  AuthSessionContext,
  Course,
  HomeMetricsData,
  CourseDetailData
} from '@ieb/shared'

export interface CoursesBackendPort {
  listAccessibleCourses(session: AuthSessionContext): Promise<Course[]>
  getAccessibleCourseDetailBySlug(session: AuthSessionContext, courseSlug: string): Promise<CourseDetailData>
  getHomeMetrics(session: AuthSessionContext): Promise<HomeMetricsData>
  listAdminCoursesForManagement(session: AuthSessionContext): Promise<Course[]>
  getAdminCourseBySlug(session: AuthSessionContext, courseSlug: string): Promise<Course>
  createAdminCourse(session: AuthSessionContext, input: AdminCourseInput): Promise<Course>
  updateAdminCourseBySlug(session: AuthSessionContext, courseSlug: string, input: AdminCourseInput): Promise<Course>
  deleteAdminCourseBySlug(session: AuthSessionContext, courseSlug: string): Promise<Course>
}
