import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function viteBase() {
  const p = process.env.VITE_BASE_PATH
  if (!p || p.length === 0) return './'
  return p.startsWith('/') ? p : `/${p}`.replace(/\/?$/, '/')
}

export default defineConfig({
  base: viteBase(),
  plugins: [react(), tailwindcss()],
})
