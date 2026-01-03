import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 將 base 設為 GitHub Pages 專案路徑（如 /temper/）
export default defineConfig({
  plugins: [react()],
  base: '/temper/',
})
