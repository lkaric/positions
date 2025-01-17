import { create } from 'zustand';
import { combine, createJSONStorage, persist } from 'zustand/middleware';

import { ProviderEnum } from '../constants';

const useProviderStore = create(
  persist(
    combine(
      {
        provider: ProviderEnum.METAMASK,
      },
      (set) => {
        return {
          setProvider: (provider: ProviderEnum) => {
            set(() => ({
              provider: provider,
            }));
          },
        };
      },
    ),
    { storage: createJSONStorage(() => localStorage), name: 'provider' },
  ),
);

export { useProviderStore };
