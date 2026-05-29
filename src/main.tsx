import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Trainer } from './components/Trainer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Trainer />
  </StrictMode>,
)
