// src/pages/About.tsx

import { Title, Button } from '@mantine/core'
import { Link } from 'react-router-dom'

export function About() {
  return (
    <>
      <Title>關於我們</Title>
      <Link to="/">
        <Button variant="outline" mt="md">回到首頁</Button>
      </Link>
    </>
  )
}
