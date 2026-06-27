// src/theme.ts
// 集中管理的 Mantine 主題設定

import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'violet',
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.375rem'
  },
  headings: {
    sizes: {
      h1: { fontSize: '2rem' },
      h2: { fontSize: '1.625rem' },
      h3: { fontSize: '1.375rem' }
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  defaultRadius: 'md'
})
