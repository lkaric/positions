import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

import { ProviderEnum } from '../constants';
import { useProviderStore } from '../hooks';

const ProviderSelect: React.FC = () => {
  const { provider, setProvider } = useProviderStore();

  return (
    <Select
      value={provider}
      onValueChange={(value) => setProvider(value as ProviderEnum)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Provider" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ProviderEnum.METAMASK}>Metamask</SelectItem>
        {/* TODO: Disabled due to the rates, enable after completion */}
        <SelectItem value={ProviderEnum.INFURA} disabled>
          Infura
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export { ProviderSelect };
