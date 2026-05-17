import type {
  ButtonVariant,
  AdminActivityLog,
  Assessment,
  AssessmentAttempt,
  AssessmentAttemptStatus,
  AssessmentPlatformSettings,
  AssessmentQuestionType,
  Classroom,
  Course,
  CourseEnrollment,
  CourseModule,
  CourseVisibility,
  HighlightActionTarget,
  HighlightMediaType,
  Lesson,
  LessonContentType,
  PlatformHighlight,
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

export interface AdminUsersPagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface AdminUsersData {
  items: User[]
  pagination: AdminUsersPagination
}

export type AdminUsersResponse = ApiResponse<AdminUsersData | null>
export type AdminUserResponse = ApiResponse<User | null>

export interface AdminUserEnrollmentsData {
  user: User
  courses: Course[]
  enrollments: CourseEnrollment[]
}

export interface AdminUserEnrollmentsInput {
  courseIds: string[]
}

export type AdminUserEnrollmentsResponse = ApiResponse<AdminUserEnrollmentsData | null>

export interface AdminUploadedImageData {
  url: string
  path: string
  filename: string
}

export type AdminUploadedImageResponse = ApiResponse<AdminUploadedImageData | null>

export interface AdminUploadedFileData {
  url: string
  path: string
  filename: string
}

export type AdminUploadedLessonFileResponse = ApiResponse<AdminUploadedFileData | null>

export interface AdminLogsPagination {
  nextCursor: string | null
  pageSize: number
}

export interface AdminLogsData {
  items: AdminActivityLog[]
  pagination: AdminLogsPagination
}

export type AdminLogsResponse = ApiResponse<AdminLogsData | null>

export interface AdminHighlightActionInput {
  id: string
  label: string
  href: string
  target: HighlightActionTarget
  variant: ButtonVariant
}

export interface AdminHighlightInput {
  title: string
  description: string
  isActive: boolean
  mediaType: HighlightMediaType | null
  mediaUrl: string | null
  actions: AdminHighlightActionInput[]
  order: number
}

export type AdminHighlightsResponse = ApiResponse<PlatformHighlight[]>
export type AdminHighlightResponse = ApiResponse<PlatformHighlight | null>
export type HomeHighlightsResponse = ApiResponse<PlatformHighlight[]>

export interface AccountProfileInput {
  fullName: string
  cpf: string
  phone: string | null
  avatarUrl: string | null
  region: UserRegion
}

export type AccountProfileResponse = ApiResponse<User | null>

export interface AccountPasswordInput {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}

export interface AccountPasswordData {
  changed: true
}

export type AccountPasswordResponse = ApiResponse<AccountPasswordData | null>

export type AccountAvatarUploadResponse = ApiResponse<AdminUploadedImageData | null>

export interface AccountAssessmentAttemptItem {
  id: string
  courseId: string
  courseTitle: string
  courseHref: string | null
  moduleId: string
  moduleTitle: string
  moduleHref: string | null
  assessmentId: string
  assessmentTitle: string
  passingScore: number
  attemptNumber: number
  status: AssessmentAttemptStatus
  score: number | null
  approved: boolean | null
  submittedAt: string | null
  gradedAt: string | null
}

export type AccountAssessmentAttemptsResponse = ApiResponse<AccountAssessmentAttemptItem[]>

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
  availability: 'available' | 'blocked_pending_review' | 'blocked_attempt_limit'
  blockingMessage: string | null
  attemptsUsed: number
  attemptsRemaining: number
  maxAttempts: number
  latestAttempt: {
    id: string
    attemptNumber: number
    status: AssessmentAttemptStatus
    score: number | null
    approved: boolean | null
    submittedAt: string | null
  } | null
  questions: StudentAssessmentQuestion[]
}

export interface StudentModuleAssessmentData {
  availability: 'not_created' | 'blocked_incomplete_lessons' | 'available'
  message: string
  assessments: StudentAssessmentItem[]
  progress: ModuleDetailProgress
}

export type StudentModuleAssessmentResponse = ApiResponse<StudentModuleAssessmentData | null>

export interface StudentAssessmentSubmissionInput {
  answers: Record<string, string | string[]>
}

export interface StudentAssessmentSubmissionData {
  attempt: {
    id: string
    assessmentId: string
    attemptNumber: number
    status: AssessmentAttemptStatus
    score: number | null
    approved: boolean | null
    submittedAt: string | null
  }
}

export type StudentAssessmentSubmissionResponse = ApiResponse<StudentAssessmentSubmissionData | null>

export interface AdminAssessmentSettingsInput {
  maxAttemptsPerAssessment: number
}

export type AdminAssessmentSettingsResponse = ApiResponse<AssessmentPlatformSettings | null>

export interface AdminAssessmentAttemptViewItem {
  id: string
  userId: string
  studentName: string
  studentEmail: string
  courseId: string
  courseTitle: string
  moduleId: string
  moduleTitle: string
  assessmentId: string
  assessmentTitle: string
  assessmentQuestionType: AssessmentQuestionType
  passingScore: number
  attemptNumber: number
  status: AssessmentAttemptStatus
  score: number | null
  approved: boolean | null
  submittedAt: string | null
  gradedAt: string | null
  answers: AssessmentAttempt['answers']
}

export type AdminAssessmentAttemptsResponse = ApiResponse<AdminAssessmentAttemptViewItem[]>
export type AdminAssessmentAttemptResponse = ApiResponse<AdminAssessmentAttemptViewItem | null>

export interface AdminAssessmentAttemptScoreInput {
  score: number
}
