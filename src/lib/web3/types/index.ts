import Web3, { type Web3BaseProvider } from 'web3';
import { ProviderTypeEnum } from '../constants';

interface ProviderStrategy {
  connect: () => Promise<Web3BaseProvider>;
  disconnect?: () => void;
}

interface Web3ProviderConfig {
  contractAddress: string;
  defaultProvider?: ProviderTypeEnum;
  infuraUrl?: string;
}

interface Web3ProviderPersistedState {
  providerType: ProviderTypeEnum;
}

interface Web3ProviderActions {
  connect: (provider: ProviderTypeEnum) => Promise<void>;
  disconnect: () => void;
  setError: (error: Error | null) => void;
}

interface Web3ProviderState extends Web3ProviderPersistedState {
  client: Web3 | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
}

type Web3ProviderStore = Web3ProviderState & Web3ProviderActions;

export type {
  ProviderStrategy,
  Web3ProviderConfig,
  Web3ProviderPersistedState,
  Web3ProviderActions,
  Web3ProviderStore,
};
