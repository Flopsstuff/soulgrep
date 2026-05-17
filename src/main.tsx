import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, redirect } from 'react-router'
import './index.css'
import App from './App.tsx'
import { hasAnyKey } from './lib/keys.ts'
import Home from './routes/Home.tsx'
import ImportInstructions from './routes/ImportInstructions.tsx'
import ImportUpload from './routes/ImportUpload.tsx'
import NotFound from './routes/NotFound.tsx'
import Setup from './routes/Setup.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    loader: ({ request }) => {
      const { pathname } = new URL(request.url)
      if (pathname !== '/setup' && !hasAnyKey()) {
        throw redirect('/setup')
      }
      return null
    },
    children: [
      { index: true, Component: Home },
      { path: 'setup', Component: Setup },
      { path: 'import', Component: ImportInstructions },
      { path: 'import/upload', Component: ImportUpload },
      { path: '*', Component: NotFound },
    ],
  },
])

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
