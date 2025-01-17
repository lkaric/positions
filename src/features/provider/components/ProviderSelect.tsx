import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

import { ProviderEnum } from '../constants';

const ProviderSelect: React.FC = () => {
  return (
    <Select defaultValue={ProviderEnum.METAMASK}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Provider" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ProviderEnum.METAMASK}>Metamask</SelectItem>
        <SelectItem value={ProviderEnum.INFURA}>Infura</SelectItem>
      </SelectContent>
    </Select>
  );
};

export { ProviderSelect };
