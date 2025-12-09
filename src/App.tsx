// src/App.tsx
import { Button, Container, Title, Text } from '@mantine/core'
import { Routes, Route, Link } from 'react-router-dom'

function Home() {
  return (
    <>
      <Title>首頁</Title>
      <Text>這是 Mantine 的文字組件</Text>
      <Link to="/about">
        <Button mt="md">前往關於頁面 (測試路由)</Button>
      </Link>
    </>
  )
}

function About() {
  return (
    <>
      <Title>關於我們</Title>
      <Link to="/">
        <Button variant="outline" mt="md">回到首頁</Button>
      </Link>
    </>
  )
}

function App() {
  return (
    <Container p="xl">
      {/* 定義路由規則 */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Container>
  )
}

export default App