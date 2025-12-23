import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import RootProd from './pages/prod_2/Root'
import RootPredRelease from './pages/prod_1/Root'
import RootDemo from './pages/demo_1/Root'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootProd />,
    },
    {
      path: '/predRelease',
      element: <RootPredRelease />,
    },
    {
      path: '/demo',
      element: <RootDemo />,
    },
  ],
  {
    basename: '/FTS__pd_v_it__React_TS_Vite/',
  }
)

function App() {
  return <RouterProvider router={router} />
}

export default App
