import type {
  AdminLessonInput,
  AuthSessionContext,
  Lesson,
  LessonCompletionData,
  LessonCommentItem,
  LessonDetailData,
  LessonProgressUpdateData
} from '@ieb/shared'

export interface LessonsBackendPort {
  listAdminLessonsForManagement(
    session: AuthSessionContext,
    filters?: { courseId?: string; moduleId?: string }
  ): Promise<Lesson[]>
  getAdminLessonBySlug(session: AuthSessionContext, lessonSlug: string): Promise<Lesson>
  createAdminLesson(session: AuthSessionContext, input: AdminLessonInput): Promise<Lesson>
  updateAdminLessonBySlug(session: AuthSessionContext, lessonSlug: string, input: AdminLessonInput): Promise<Lesson>
  deleteAdminLessonBySlug(session: AuthSessionContext, lessonSlug: string): Promise<Lesson>
  getAccessibleLessonDetailBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string
  ): Promise<LessonDetailData>
  updateLessonProgressBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    input: { lastPositionInSeconds: number; markAsCompleted: boolean; hasCompletionOverride: boolean }
  ): Promise<LessonProgressUpdateData>
  markLessonAsCompletedBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string
  ): Promise<LessonCompletionData>
  listLessonCommentsBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string
  ): Promise<LessonCommentItem[]>
  createLessonCommentBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    content: string
  ): Promise<LessonCommentItem>
  updateLessonCommentBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    commentId: string,
    content: string
  ): Promise<LessonCommentItem>
  deleteLessonCommentBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    commentId: string
  ): Promise<void>
}

export interface AdminLogPort {
  write(
    session: AuthSessionContext,
    entry: {
      action: 'create' | 'update' | 'delete'
      targetCollection: string
      targetId: string
      summary: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void>
}
