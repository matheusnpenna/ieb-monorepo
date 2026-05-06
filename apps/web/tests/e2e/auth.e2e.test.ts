import { expect, test } from '@playwright/test'

const authenticatedUser = {
  id: 'user-e2e-1',
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  role: 'student',
  status: 'active',
  region: 'feira-de-santana',
  avatarUrl: null
}

test('redirects unauthenticated users, performs login and preserves authenticated navigation', async ({
  page
}) => {
  let isAuthenticated = false

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: isAuthenticated,
        user: isAuthenticated ? authenticatedUser : null
      })
    })
  })

  await page.route('**/api/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email?: string; password?: string } | null

    if (body?.email === authenticatedUser.email && body?.password === 'super-secret') {
      isAuthenticated = true

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: authenticatedUser
        })
      })

      return
    }

    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        statusMessage: 'Credenciais invalidas.'
      })
    })
  })

  await page.goto('/home')

  await expect(page).toHaveURL(/\/login\?redirect=\/home$/)
  await expect(page.getByRole('heading', { name: 'Instituto Eurico Bergsten' })).toBeVisible()

  await page.getByLabel('E-mail').fill(authenticatedUser.email)
  await page.getByLabel('Senha').fill('super-secret')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL('/home')
  await expect(page.getByText('Continuar assistindo').first()).toBeVisible()

  await page.reload()

  await expect(page).toHaveURL('/home')
  await expect(page.getByText('Todos os cursos').first()).toBeVisible()

  await page.goto('/login')

  await expect(page).toHaveURL('/home')
})
