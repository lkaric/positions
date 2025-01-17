import { useCallback, useEffect, useState } from 'react';
import Web3, { HttpProvider } from 'web3';

import { ProviderEnum } from '../constants';

import { useProviderStore } from './useProviderStore';

const initializeMetamaskProvider = async () => {
  if (typeof window?.ethereum === 'undefined') {
    // TODO: Handle error
    throw new Error('MetaMask not installed!');
  }

  const instance = new Web3(window.ethereum);
  await instance.eth.requestAccounts();

  return instance;
};

const initializeInfuraProvider = () => {
  const httpProvider = new HttpProvider(import.meta.env.VITE_INFURA_URL);

  const instance = new Web3(httpProvider);

  return instance;
};

const useProvider = (): [Web3 | null, boolean] => {
  const { provider } = useProviderStore();
  const [client, setClient] = useState<null | Web3>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInitialization = useCallback(async (provider: ProviderEnum) => {
    if (provider === ProviderEnum.METAMASK) {
      setIsLoading(true);
      const instance = await initializeMetamaskProvider();
      setClient(instance);
    }

    if (provider === ProviderEnum.INFURA) {
      const instance = initializeInfuraProvider();
      setClient(instance);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    handleInitialization(provider);
  }, [handleInitialization, provider]);

  return [client, isLoading];
};

export { useProvider };
