import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['dist/**', 'test/**', '**/*.config.ts'],
    },
    setupFiles: ['./test/setup.ts'],
  },
});
