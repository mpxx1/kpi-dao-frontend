import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(
      process.env.NODE_ENV ?? 'development',
    ),
  },
  resolve: {
    alias: {
      buffer: fileURLToPath(
        new URL('./node_modules/buffer/', import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    include: ['buffer', '@coral-xyz/anchor'],
  },
})
