/// <reference types="vite/client" />
import { type MetaMaskInpageProvider } from '@metamask/providers';

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_INFURA_URL: string;
  readonly VITE_INFURA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}
