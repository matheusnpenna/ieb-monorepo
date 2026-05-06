import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const pnpmStoreDir = fileURLToPath(new URL('../../node_modules/.pnpm/', import.meta.url))
const vuePackageDir = readdirSync(pnpmStoreDir).find((entry) => entry.startsWith('vue@'))

if (!vuePackageDir) {
  throw new Error('Unable to resolve the Vue package from the pnpm store.')
}

const vueRuntimePath = join(
  pnpmStoreDir,
  vuePackageDir,
  'node_modules/vue/dist/vue.runtime.esm-bundler.js'
)

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
      {
        plugins: [vue()],
        resolve: {
          alias: {
            vue: vueRuntimePath
          }
        },
        test: {
          name: 'components',
          include: ['app/**/*.test.ts'],
          environment: 'happy-dom',
          clearMocks: true,
          restoreMocks: true,
          mockReset: true
        }
      }
    ]
  }
})
