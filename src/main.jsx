import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StadiumProvider } from './context/StadiumContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StadiumProvider>
      <App />
    </StadiumProvider>
  </StrictMode>,
)
