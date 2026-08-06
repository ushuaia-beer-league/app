import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { App } from './App'
import { AdminApp } from './admin/AdminApp'
import { CountVisit } from './data/CountVisit'
import { LanguageProvider } from './i18n/LanguageProvider'
import './index.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('The #root container is missing from index.html')
}

/**
 * Two applications on one deploy: the public site at the base, the back office
 * under `/admin/`.
 *
 * `basename` is Vite's base, which is `/app/` on Pages and `/` anywhere else, so
 * neither the router nor any link has to know where the site is mounted. A deep
 * link works because the build writes `404.html`, and GitHub Pages answers an
 * unknown path with it.
 */
createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <LanguageProvider>
        <CountVisit />
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<App />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
