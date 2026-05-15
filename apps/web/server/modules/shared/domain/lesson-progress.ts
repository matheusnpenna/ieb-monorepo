import type { Lesson, LessonProgress } from '@ieb/shared'

export const hasLessonProgressStarted = (lessonProgress: LessonProgress) =>
  !lessonProgress.deletedAt &&
  (lessonProgress.watchedMinutes > 0 ||
    lessonProgress.lastPositionInSeconds > 0 ||
    lessonProgress.completionRate > 0 ||
    lessonProgress.markedAsCompleted ||
    Boolean(lessonProgress.completedAt))

export const isLessonProgressCompleted = (lessonProgress: LessonProgress) =>
  !lessonProgress.deletedAt &&
  (lessonProgress.markedAsCompleted || Boolean(lessonProgress.completedAt) || lessonProgress.completionRate >= 100)

export const buildLessonDetailProgress = (lesson: Lesson, lessonProgressList: LessonProgress[]) => {
  const existingLessonProgress = lessonProgressList.find(
    (lessonProgress) => lessonProgress.lessonId === lesson.id && !lessonProgress.deletedAt
  )

  return {
    lastPositionInSeconds: existingLessonProgress?.lastPositionInSeconds || 0,
    watchedMinutes: existingLessonProgress?.watchedMinutes || 0,
    completionRate: existingLessonProgress?.completionRate || 0,
    isCompleted: existingLessonProgress ? isLessonProgressCompleted(existingLessonProgress) : false
  }
}

export const buildLessonProgressUpdatePayload = (
  lesson: Lesson,
  existingLessonProgress: LessonProgress | null,
  input: {
    lastPositionInSeconds?: number
    markAsCompleted?: boolean
    hasCompletionOverride?: boolean
  },
  completedAtFactory: () => string
) => {
  const lessonDurationInSeconds = Math.max(lesson.durationInMinutes * 60, 1)
  const normalizedPosition = Math.max(0, Math.min(Math.floor(input.lastPositionInSeconds || 0), lessonDurationInSeconds))
  const nextWatchedMinutes = Math.max(existingLessonProgress?.watchedMinutes || 0, Math.ceil(normalizedPosition / 60))
  const derivedCompletionRate = Math.min(
    100,
    Math.max(existingLessonProgress?.completionRate || 0, Math.round((normalizedPosition / lessonDurationInSeconds) * 100))
  )
  const hasCompletionOverride = Boolean(input.hasCompletionOverride)
  const shouldMarkAsCompleted = hasCompletionOverride
    ? Boolean(input.markAsCompleted)
    : Boolean(existingLessonProgress && isLessonProgressCompleted(existingLessonProgress)) || derivedCompletionRate >= 100
  const nextCompletionRate = hasCompletionOverride
    ? shouldMarkAsCompleted
      ? 100
      : Math.min(99, derivedCompletionRate)
    : shouldMarkAsCompleted
      ? 100
      : derivedCompletionRate

  return {
    lastPositionInSeconds: normalizedPosition,
    watchedMinutes: nextWatchedMinutes,
    completionRate: nextCompletionRate,
    markedAsCompleted: shouldMarkAsCompleted,
    completedAt: shouldMarkAsCompleted ? existingLessonProgress?.completedAt || completedAtFactory() : null
  }
}

export const buildManualLessonCompletionPayload = (
  lesson: Lesson,
  existingLessonProgress: LessonProgress | null,
  completedAtFactory: () => string
) => ({
  watchedMinutes: Math.max(existingLessonProgress?.watchedMinutes || 0, lesson.durationInMinutes),
  completionRate: 100,
  lastPositionInSeconds: Math.max(existingLessonProgress?.lastPositionInSeconds || 0, lesson.durationInMinutes * 60),
  markedAsCompleted: true,
  completedAt: existingLessonProgress?.completedAt || completedAtFactory()
})
