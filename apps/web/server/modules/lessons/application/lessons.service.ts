import type { AdminLessonInput, AuthSessionContext } from '@ieb/shared'
import type { LessonsBackendPort } from './ports'

interface LessonsServiceDependencies {
  backend: LessonsBackendPort
}

export class LessonsService {
  private readonly backend: LessonsBackendPort

  constructor(dependencies: LessonsServiceDependencies) {
    this.backend = dependencies.backend
  }

  listAdminLessonsForManagement = (session: AuthSessionContext, filters?: { courseId?: string; moduleId?: string }) =>
    this.backend.listAdminLessonsForManagement(session, filters)
  getAdminLessonBySlug = (session: AuthSessionContext, lessonSlug: string) =>
    this.backend.getAdminLessonBySlug(session, lessonSlug)
  createAdminLesson = (session: AuthSessionContext, input: AdminLessonInput) =>
    this.backend.createAdminLesson(session, input)
  updateAdminLessonBySlug = (session: AuthSessionContext, lessonSlug: string, input: AdminLessonInput) =>
    this.backend.updateAdminLessonBySlug(session, lessonSlug, input)
  deleteAdminLessonBySlug = (session: AuthSessionContext, lessonSlug: string) =>
    this.backend.deleteAdminLessonBySlug(session, lessonSlug)
  getAccessibleLessonDetailBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string
  ) => this.backend.getAccessibleLessonDetailBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  updateLessonProgressBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    input: { lastPositionInSeconds: number; markAsCompleted: boolean; hasCompletionOverride: boolean }
  ) => this.backend.updateLessonProgressBySlugs(session, courseSlug, moduleSlug, lessonSlug, input)
  markLessonAsCompletedBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string
  ) => this.backend.markLessonAsCompletedBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  listLessonCommentsBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string
  ) => this.backend.listLessonCommentsBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  createLessonCommentBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    content: string
  ) => this.backend.createLessonCommentBySlugs(session, courseSlug, moduleSlug, lessonSlug, content)
  updateLessonCommentBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    commentId: string,
    content: string
  ) => this.backend.updateLessonCommentBySlugs(session, courseSlug, moduleSlug, lessonSlug, commentId, content)
  deleteLessonCommentBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    commentId: string
  ) => this.backend.deleteLessonCommentBySlugs(session, courseSlug, moduleSlug, lessonSlug, commentId)
}
