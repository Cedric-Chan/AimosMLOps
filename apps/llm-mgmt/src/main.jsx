import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('AIMOS_MAIN_EXEC', !!document.getElementById('root'))
try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('AIMOS_RENDER_CALLED_OK')
} catch (e) {
  console.error('AIMOS_RENDER_THROWN', e.message)
}
