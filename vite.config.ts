import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // A small browser stand-in, so the engine's SVG parsing and storage work in tests.
    environment: 'happy-dom',
    setupFiles: ['src/test/setup.ts'],
  },
})
