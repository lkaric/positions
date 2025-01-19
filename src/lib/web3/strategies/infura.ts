import { HttpProvider, type Web3BaseProvider } from 'web3';

import { ProviderStrategy } from '../types';

class InfuraStrategy implements ProviderStrategy {
  constructor(private readonly infuraUrl: string) {
    if (!infuraUrl) {
      throw new Error('Infura URL is required!');
    }
  }

  async connect(): Promise<Web3BaseProvider> {
    return new HttpProvider(this.infuraUrl);
  }
}

export { InfuraStrategy };
