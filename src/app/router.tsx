import { createBrowserRouter, RouterProvider } from 'react-router';

import { Layout } from '@/components';

import { HomePage } from './pages';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
    ],
  },
]);

const Router: React.FC = () => <RouterProvider router={router} />;

export { Router };
