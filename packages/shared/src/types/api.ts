import type {
  AdminActivityLog,
  Assessment,
  AssessmentQuestionType,
  Classroom,
  Course,
  CourseModule,
  CourseVisibility,
  Lesson,
  LessonContentType,
  User,
  UserRegion,
  UserRole,
  UserStatus,
  VideoProvider
} from './database'

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

export interface AdminModuleInput {
  courseId: string
  title: string
  slug: string
  description: string
  order: number
  estimatedDurationInMinutes: number
}

export type AdminModulesResponse = ApiResponse<CourseModule[]>
export type AdminModuleResponse = ApiResponse<CourseModule | null>

export interface AdminLessonInput {
  courseId: string
  moduleId: string
  title: string
  slug: string
  description: string
  order: number
  contentType: LessonContentType
  videoProvider: VideoProvider | null
  mediaUrl: string | null
  thumbnailUrl: string | null
  durationInMinutes: number
  bodyContent: string | null
  allowManualCompletion: boolean
}

export type AdminLessonsResponse = ApiResponse<Lesson[]>
export type AdminLessonResponse = ApiResponse<Lesson | null>

export interface AdminAssessmentQuestionOptionInput {
  id: string
  label: string
  isCorrect: boolean
}

export interface AdminAssessmentQuestionInput {
  id: string
  prompt: string
  explanation: string | null
  options: AdminAssessmentQuestionOptionInput[]
}

export interface AdminAssessmentInput {
  courseId: string
  moduleId: string
  title: string
  slug: string
  description: string
  questionType: AssessmentQuestionType
  passingScore: number
  timeLimitInMinutes: number | null
  questions: AdminAssessmentQuestionInput[]
}

export type AdminAssessmentsResponse = ApiResponse<Assessment[]>
export type AdminAssessmentResponse = ApiResponse<Assessment | null>

export interface AdminClassroomInput {
  name: string
  uuid: string
  description: string
  registrationOpen: boolean
  registrationStartsAt: string | null
  registrationEndsAt: string | null
  linkedCourseIds: string[]
}

export type AdminClassroomsResponse = ApiResponse<Classroom[]>
export type AdminClassroomResponse = ApiResponse<Classroom | null>

export interface AdminUserInput {
  fullName: string
  cpf: string
  email: string
  password: string | null
  role: UserRole
  status: UserStatus
  phone: string | null
  avatarUrl: string | null
  region: UserRegion
}

export type AdminUsersResponse = ApiResponse<User[]>
export type AdminUserResponse = ApiResponse<User | null>

export interface AdminUploadedImageData {
  url: string
  path: string
  filename: string
}

export type AdminUploadedImageResponse = ApiResponse<AdminUploadedImageData | null>

export interface AdminLogsPagination {
  nextCursor: string | null
  pageSize: number
}

export interface AdminLogsData {
  items: AdminActivityLog[]
  pagination: AdminLogsPagination
}

export type AdminLogsResponse = ApiResponse<AdminLogsData | null>

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

export interface StudentAssessmentQuestionOption {
  id: string
  label: string
}

export interface StudentAssessmentQuestion {
  id: string
  prompt: string
  options: StudentAssessmentQuestionOption[]
}

export interface StudentAssessmentItem {
  id: string
  slug: string
  title: string
  description: string
  questionType: AssessmentQuestionType
  passingScore: number
  timeLimitInMinutes: number | null
  questionCount: number
  questions: StudentAssessmentQuestion[]
}

export interface StudentModuleAssessmentData {
  availability: 'not_created' | 'blocked_incomplete_lessons' | 'available'
  message: string
  assessments: StudentAssessmentItem[]
  progress: ModuleDetailProgress
}

export type StudentModuleAssessmentResponse = ApiResponse<StudentModuleAssessmentData | null>
