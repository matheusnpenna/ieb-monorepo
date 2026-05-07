import type { Assessment, Course, CourseModule, CourseVisibility, Lesson } from './database'

export interface ApiSuccessResponse<T> {
  status: 'success'
  message?: string
  data: T
}

export interface ApiErrorResponse<T> {
  status: 'error'
  messages: string[]
  data: T
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse<T>

export type CourseListResponse = ApiResponse<Course[]>

export interface HomeMetricsContinueWatching {
  lessonTitle: string | null
  courseTitle: string | null
  href: string | null
}

export interface HomeMetricsCompletedCourses {
  count: number
}

export interface HomeMetricsData {
  continueWatching: HomeMetricsContinueWatching
  completedCourses: HomeMetricsCompletedCourses
}

export type HomeMetricsResponse = ApiResponse<HomeMetricsData | null>

export interface AdminCourseInput {
  title: string
  slug: string
  shortDescription: string
  description: string
  visibility: CourseVisibility
  coverImageUrl: string | null
  heroImageUrl: string | null
  totalDurationInMinutes: number
  requiredCompletionRate: number
  certificateEnabled: boolean
}

export type AdminCoursesResponse = ApiResponse<Course[]>
export type AdminCourseResponse = ApiResponse<Course | null>

export interface AdminUploadedImageData {
  url: string
  path: string
  filename: string
}

export type AdminUploadedImageResponse = ApiResponse<AdminUploadedImageData | null>

export interface CourseDetailActionLinks {
  startCourseHref: string | null
  continueWatchingHref: string | null
}

export interface CourseDetailData {
  course: Course
  modules: CourseModule[]
  actions: CourseDetailActionLinks
}

export type CourseDetailResponse = ApiResponse<CourseDetailData | null>

export interface ModuleDetailProgress {
  completionPercentage: number
  completedLessons: number
  totalLessons: number
}

export interface ModuleDetailLesson extends Lesson {
  isCompleted: boolean
}

export interface ModuleDetailData {
  module: CourseModule
  lessons: ModuleDetailLesson[]
  assessment: Assessment | null
  progress: ModuleDetailProgress
}

export type ModuleDetailResponse = ApiResponse<ModuleDetailData | null>

export interface LessonCompletionData {
  lessonId: string
  isCompleted: true
}

export type LessonCompletionResponse = ApiResponse<LessonCompletionData | null>

export interface LessonNavigationItem {
  id: string
  title: string
  slug: string
  href: string
}

export interface LessonDetailProgress {
  lastPositionInSeconds: number
  watchedMinutes: number
  completionRate: number
  isCompleted: boolean
}

export interface LessonDetailData {
  lesson: Lesson
  module: CourseModule
  videoUrl: string | null
  progress: LessonDetailProgress
  previousLesson: LessonNavigationItem | null
  nextLesson: LessonNavigationItem | null
}

export type LessonDetailResponse = ApiResponse<LessonDetailData | null>

export interface LessonProgressUpdateData {
  lessonId: string
  lastPositionInSeconds: number
  watchedMinutes: number
  completionRate: number
  isCompleted: boolean
}

export type LessonProgressUpdateResponse = ApiResponse<LessonProgressUpdateData | null>

export interface LessonCommentAuthor {
  id: string
  fullName: string
  avatarUrl: string | null
}

export interface LessonCommentItem {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  canEdit: boolean
  canDelete: boolean
  author: LessonCommentAuthor
}

export type LessonCommentsResponse = ApiResponse<LessonCommentItem[]>
export type LessonCommentResponse = ApiResponse<LessonCommentItem | null>
