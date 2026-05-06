import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
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
