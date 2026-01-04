// src/App.tsx
import { Container } from '@mantine/core'
import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { Trainer } from './pages/Trainer'

function App() {
  return (
    <Container p="xl">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/trainer" element={<Trainer />} />
      </Routes>
    </Container>
  )
}

export default App
