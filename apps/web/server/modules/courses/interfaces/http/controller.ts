import type {
  AdminCourseInput,
  AdminCourseResponse,
  AdminCoursesResponse,
  CourseDetailResponse,
  CourseListResponse,
  HomeMetricsResponse
} from '@ieb/shared'
import { readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { getCoursesModule } from '../../courses.module'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

const normalizeAdminCourseInput = (body: AdminCourseInput | null | undefined): AdminCourseInput => ({
  title: body?.title || '',
  slug: body?.slug || '',
  shortDescription: body?.shortDescription || '',
  description: body?.description || '',
  visibility: body?.visibility || 'draft',
  coverImageUrl: body?.coverImageUrl ?? null,
  heroImageUrl: body?.heroImageUrl ?? null,
  totalDurationInMinutes: Number(body?.totalDurationInMinutes ?? 0),
  requiredCompletionRate: Number(body?.requiredCompletionRate ?? 0),
  certificateEnabled: Boolean(body?.certificateEnabled)
})

export const handleListAccessibleCourses = async (event: H3Event): Promise<CourseListResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courses = await getCoursesModule().service.listAccessibleCourses(session)

    return {
      status: 'success',
      data: courses
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os cursos.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
}

export const handleGetAccessibleCourseDetail = async (event: H3Event): Promise<CourseDetailResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const courseDetail = await getCoursesModule().service.getAccessibleCourseDetailBySlug(session, courseSlug)

    return {
      status: 'success',
      data: courseDetail
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar o curso.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleGetHomeMetrics = async (event: H3Event): Promise<HomeMetricsResponse> => {
  try {
    const session = await requireAuthSession(event)
    const metrics = await getCoursesModule().service.getHomeMetrics(session)

    return {
      status: 'success',
      data: metrics
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar as metricas da home.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleListAdminCourses = async (event: H3Event): Promise<AdminCoursesResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const courses = await getCoursesModule().service.listAdminCoursesForManagement(session)

    return {
      status: 'success',
      data: courses
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os cursos do painel.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
}

export const handleCreateAdminCourse = async (event: H3Event): Promise<AdminCourseResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminCourseInput>(event)
    const course = await getCoursesModule().service.createAdminCourse(session, normalizeAdminCourseInput(body))

    return {
      status: 'success',
      data: course
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel criar o curso.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleGetAdminCourse = async (event: H3Event): Promise<AdminCourseResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const course = await getCoursesModule().service.getAdminCourseBySlug(session, courseSlug)

    return {
      status: 'success',
      data: course
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar o curso.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleUpdateAdminCourse = async (event: H3Event): Promise<AdminCourseResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const body = await readBody<AdminCourseInput>(event)
    const course = await getCoursesModule().service.updateAdminCourseBySlug(
      session,
      courseSlug,
      normalizeAdminCourseInput(body)
    )

    return {
      status: 'success',
      data: course
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar o curso.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleDeleteAdminCourse = async (event: H3Event): Promise<AdminCourseResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const course = await getCoursesModule().service.deleteAdminCourseBySlug(session, courseSlug)

    return {
      status: 'success',
      data: course
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel remover o curso.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}
