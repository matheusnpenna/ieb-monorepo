import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          include: ['tests/server/**/*.spec.ts'],
          environment: 'node',
          clearMocks: true,
          restoreMocks: true,
          mockReset: true
        }
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.nuxt.spec.ts'],
          environment: 'nuxt',
          clearMocks: true,
          restoreMocks: true,
          mockReset: true,
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('./', import.meta.url))
            }
          }
        }
      })
    ]
  }
})
