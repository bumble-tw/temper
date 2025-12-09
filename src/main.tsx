// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom' // 1. 引入 HashRouter
import { MantineProvider } from '@mantine/core' // 2. 引入 MantineProvider
import '@mantine/core/styles.css' // 3. 務必引入 Mantine 全域樣式
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 最外層包覆 MantineProvider 讓樣式生效 */}
    <MantineProvider>
      {/* 內層包覆 HashRouter 讓路由生效 */}
      <HashRouter>
        <App />
      </HashRouter>
    </MantineProvider>
  </StrictMode>,
)