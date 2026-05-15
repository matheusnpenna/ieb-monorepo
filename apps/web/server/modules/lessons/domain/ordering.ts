export const clampLessonOrder = (value: number, totalLessons: number) => {
  const normalizedValue = Math.max(1, Math.floor(value || 1))

  return Math.min(normalizedValue, Math.max(1, totalLessons))
}
