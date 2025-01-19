import { HelmetProvider } from 'react-helmet-async';

import {
  createWeb3Store,
  initializeWeb3Store,
  ProviderTypeEnum,
} from '@/lib/web3';

import { Router } from './router';

const web3Store = createWeb3Store({
  defaultProvider: ProviderTypeEnum.METAMASK,
  infuraUrl: import.meta.env.VITE_INFURA_URL,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
});

initializeWeb3Store(web3Store);

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router />
    </HelmetProvider>
  );
};

export { App };
