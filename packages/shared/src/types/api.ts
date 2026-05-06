import type { Course } from './database'

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
