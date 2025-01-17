import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ProviderEnum } from '../constants';

interface ProviderStore {
  provider: ProviderEnum;
  error: string | null;
  setProvider: (provider: ProviderEnum) => void;
  setError: (message: string) => void;
}

const providerStore: StateCreator<
  ProviderStore,
  [['zustand/persist', unknown]]
> = (set) => ({
  provider: ProviderEnum.METAMASK,
  error: null,
  setProvider: (provider) => set(() => ({ provider })),
  setError: (message) => set(() => ({ error: message })),
});

const useProviderStore = create<ProviderStore>()(
  persist(providerStore, {
    name: 'provider',
    storage: createJSONStorage(() => localStorage),
  }),
);

export { useProviderStore };
