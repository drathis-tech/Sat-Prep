import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App.jsx'
import Starfield from './Starfield.jsx'
import { ScreenFadeProvider } from './ScreenFade.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Starfield />
    <ScreenFadeProvider>
      <App />
    </ScreenFadeProvider>
  </StrictMode>,
)
