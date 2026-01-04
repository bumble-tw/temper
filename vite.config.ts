import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 本地開發時使用根路徑 /，生產環境使用 /temper/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/temper/' : '/',
}))
