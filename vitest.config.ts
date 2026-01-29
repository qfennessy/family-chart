import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.bench.ts'],
    globals: true,
    testTimeout: 60000,
    benchmark: {
      include: ['tests/**/*.bench.ts'],
      reporters: ['default'],
    },
  },
})
