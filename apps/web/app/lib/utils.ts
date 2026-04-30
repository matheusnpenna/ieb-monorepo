export const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(' ')

export const getRequestErrorMessage = (error: unknown, fallback: string) => {
  const requestError = error as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }

  return requestError?.data?.statusMessage || requestError?.statusMessage || requestError?.message || fallback
}

export const resolveSafeRedirect = (value: unknown, fallback = '/home') => {
  if (typeof value !== 'string') {
    return fallback
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }

  return value
}
