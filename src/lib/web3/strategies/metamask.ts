import { type Web3BaseProvider } from 'web3';

import { ProviderStrategy } from '../types';

class MetamaskStrategy implements ProviderStrategy {
  async connect(): Promise<Web3BaseProvider> {
    if (typeof window?.ethereum === 'undefined') {
      throw new Error('MetaMask not installed!');
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      return window.ethereum as unknown as Web3BaseProvider;
    } catch (error) {
      console.error('Error', error);

      throw new Error('Failed to connect to MetaMask!');
    }
  }
}

export { MetamaskStrategy };
