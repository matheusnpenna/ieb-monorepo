import type { Assessment, Course, CourseModule, Lesson } from './database'

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
