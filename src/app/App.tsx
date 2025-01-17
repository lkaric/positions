import { HelmetProvider } from 'react-helmet-async';

import { Router } from './router';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router />
    </HelmetProvider>
  );
};

export { App };
