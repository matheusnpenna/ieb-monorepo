export type TimestampValue = string

export type UserRole = 'admin' | 'student'
export type UserRegion =
  | 'feira-de-santana'
  | 'panambi'
  | 'sertao'
  | 'aluno-externo'

export type UserStatus = 'invited' | 'active' | 'blocked'
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type CourseVisibility = 'draft' | 'published' | 'archived'
export type LessonContentType = 'video' | 'text' | 'audio'
export type VideoProvider = 'youtube' | 'vimeo' | 'upload' | 'embed'
export type HighlightKind = 'news' | 'course' | 'announcement'
export type AdminActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish'
  | 'login'
  | 'logout'

export interface BaseDocument {
  id: string
  createdAt: TimestampValue
  updatedAt: TimestampValue
  deletedAt: TimestampValue | null
}

export interface AuditedDocument extends BaseDocument {
  createdBy: string | null
  updatedBy: string | null
  deletedBy: string | null
}

export interface User extends AuditedDocument {
  role: UserRole
  status: UserStatus
  fullName: string
  cpf: string
  email: string
  phone: string | null
  avatarUrl: string | null
  region: UserRegion
  lastLoginAt: TimestampValue | null
}

export interface Classroom extends AuditedDocument {
  name: string
  uuid: string
  description: string
  registrationOpen: boolean
  registrationStartsAt: TimestampValue | null
  registrationEndsAt: TimestampValue | null
  linkedCourseIds: string[]
}

export interface Course extends AuditedDocument {
  title: string
  slug: string
  shortDescription: string
  description: string
  visibility: CourseVisibility
  coverImageUrl: string | null
  heroImageUrl: string | null
  totalDurationInMinutes: number
  moduleIds: string[]
  highlightIds: string[]
  requiredCompletionRate: number
  certificateEnabled: boolean
}

export interface CourseModule extends AuditedDocument {
  courseId: string
  title: string
  slug: string
  description: string
  order: number
  lessonIds: string[]
  assessmentIds: string[]
  estimatedDurationInMinutes: number
}

export interface Lesson extends AuditedDocument {
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

export interface AssessmentQuestionOption {
  id: string
  label: string
  isCorrect: boolean
}

export interface AssessmentQuestion {
  id: string
  prompt: string
  explanation: string | null
  options: AssessmentQuestionOption[]
}

export interface Assessment extends AuditedDocument {
  courseId: string
  moduleId: string
  title: string
  slug: string
  description: string
  passingScore: number
  timeLimitInMinutes: number | null
  questions: AssessmentQuestion[]
}

export interface CourseEnrollment extends AuditedDocument {
  userId: string
  classroomId: string
  courseId: string
  status: EnrollmentStatus
  startedAt: TimestampValue | null
  completedAt: TimestampValue | null
  certificateIssuedAt: TimestampValue | null
}

export interface LessonProgress extends AuditedDocument {
  userId: string
  courseId: string
  moduleId: string
  lessonId: string
  watchedMinutes: number
  completionRate: number
  lastPositionInSeconds: number
  markedAsCompleted: boolean
  completedAt: TimestampValue | null
}

export interface ModuleProgress extends AuditedDocument {
  userId: string
  courseId: string
  moduleId: string
  lessonCompletionRate: number
  markedAsCompleted: boolean
  completedAt: TimestampValue | null
}

export interface AssessmentAttempt extends AuditedDocument {
  userId: string
  courseId: string
  moduleId: string
  assessmentId: string
  score: number
  approved: boolean
  answers: Record<string, string[]>
  submittedAt: TimestampValue | null
}

export interface Certificate extends AuditedDocument {
  userId: string
  courseId: string
  enrollmentId: string
  pdfUrl: string | null
  verificationCode: string
  issuedAt: TimestampValue
}

export interface PlatformHighlight extends AuditedDocument {
  kind: HighlightKind
  title: string
  description: string
  imageUrl: string | null
  ctaLabel: string | null
  ctaHref: string | null
  order: number
  publishedAt: TimestampValue | null
}

export interface AdminActivityLog extends BaseDocument {
  actorUserId: string
  actorEmail: string
  action: AdminActionType
  targetCollection: string
  targetId: string
  summary: string
  metadata: Record<string, unknown>
}

export type FirestoreCollections =
  | 'users'
  | 'classrooms'
  | 'courses'
  | 'modules'
  | 'lessons'
  | 'assessments'
  | 'enrollments'
  | 'lessonProgress'
  | 'moduleProgress'
  | 'assessmentAttempts'
  | 'certificates'
  | 'highlights'
  | 'adminLogs'

export type FirestoreCollectionName = `v2_${FirestoreCollections}`
