import type { LessonsBackendPort } from '../application/ports'
import {
  createAdminLesson,
  createLessonCommentBySlugs,
  deleteAdminLessonBySlug,
  deleteLessonCommentBySlugs,
  getAccessibleLessonDetailBySlugs,
  getAdminLessonBySlug,
  listAdminLessonsForManagement,
  listLessonCommentsBySlugs,
  markLessonAsCompletedBySlugs,
  updateAdminLessonBySlug,
  updateLessonCommentBySlugs,
  updateLessonProgressBySlugs
} from '../../../utils/courses'

export class LegacyLessonsAdapter implements LessonsBackendPort {
  listAdminLessonsForManagement = listAdminLessonsForManagement
  getAdminLessonBySlug = getAdminLessonBySlug
  createAdminLesson = createAdminLesson
  updateAdminLessonBySlug = updateAdminLessonBySlug
  deleteAdminLessonBySlug = deleteAdminLessonBySlug
  getAccessibleLessonDetailBySlugs = getAccessibleLessonDetailBySlugs
  updateLessonProgressBySlugs = updateLessonProgressBySlugs
  markLessonAsCompletedBySlugs = markLessonAsCompletedBySlugs
  listLessonCommentsBySlugs = listLessonCommentsBySlugs
  createLessonCommentBySlugs = createLessonCommentBySlugs
  updateLessonCommentBySlugs = updateLessonCommentBySlugs
  deleteLessonCommentBySlugs = deleteLessonCommentBySlugs
}
