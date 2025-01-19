import Web3 from 'web3';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { InfuraStrategy, MetamaskStrategy } from '../strategies';
import { ProviderTypeEnum } from '../constants';

import { type Web3ProviderStore, type Web3ProviderConfig } from '../types';

const createWeb3Store = (config: Web3ProviderConfig) => {
  const useWeb3Store = create<Web3ProviderStore>()(
    persist(
      (set) => ({
        providerType: config.defaultProvider || ProviderTypeEnum.METAMASK,

        client: null,
        account: null,
        isConnected: false,
        isConnecting: false,
        error: null,

        connect: async (providerType: ProviderTypeEnum) => {
          try {
            set({ isConnecting: true, error: null });

            const strategy =
              providerType === ProviderTypeEnum.METAMASK
                ? new MetamaskStrategy()
                : new InfuraStrategy(config.infuraUrl!);

            const provider = await strategy.connect();
            const web3 = new Web3(provider);

            // TODO: Possibly handle Account & Chain changes for MetaMask, or extend strategies to include listeners and cleanup (better encapsulation);

            set({
              providerType,
              client: web3,
              isConnected: true,
            });
          } catch (error) {
            console.log('ERROR', error);
            set({ error: error as Error });
          } finally {
            set({ isConnecting: false });
          }
        },
        disconnect: () => {
          // TODO: See how to cleanup all listeners;
        },
        setError: (error) => set({ error }),
      }),
      {
        name: 'web3-provider',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          providerType: state.providerType,
        }),
      },
    ),
  );

  const state = useWeb3Store.getState();
  state.connect(state.providerType);

  return useWeb3Store;
};

export { createWeb3Store };
