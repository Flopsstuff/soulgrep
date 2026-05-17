import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, redirect } from 'react-router'
import './index.css'
import App from './App.tsx'
import { hasActiveSelection } from './lib/keys.ts'
import Analyze from './routes/Analyze.tsx'
import Home from './routes/Home.tsx'
import Import from './routes/Import.tsx'
import NotFound from './routes/NotFound.tsx'
import Setup from './routes/Setup.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    loader: ({ request }) => {
      const { pathname } = new URL(request.url)
      if (pathname !== '/setup' && !hasActiveSelection()) {
        throw redirect('/setup')
      }
      return null
    },
    children: [
      { index: true, Component: Home },
      { path: 'setup', Component: Setup },
      { path: 'import', Component: Import },
      { path: 'import/analyze', Component: Analyze },
      { path: '*', Component: NotFound },
    ],
  },
])

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
