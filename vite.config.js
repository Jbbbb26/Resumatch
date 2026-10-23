import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During `npm run dev`, calls to /api/* go to the Express server (server.js) on port 3000.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
