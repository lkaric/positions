import { StoreApi, UseBoundStore } from 'zustand';
import { Web3ProviderStore } from '../types';
import { useCallback } from 'react';
import { ProviderTypeEnum } from '../constants';

let store: UseBoundStore<StoreApi<Web3ProviderStore>> | null = null;

const initializeWeb3Store = (
  useStore: UseBoundStore<StoreApi<Web3ProviderStore>>,
) => {
  store = useStore;
};

const useWeb3Store = () => {
  if (!store) {
    throw new Error('Web3Store not initialized');
  }

  const state = store();

  const handleConnect = useCallback(
    async (provider: ProviderTypeEnum) => {
      await state.connect(provider);
    },
    [state],
  );

  return {
    ...state,
    connect: handleConnect,
  };
};

export { initializeWeb3Store, useWeb3Store };
