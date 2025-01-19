import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { ProviderTypeEnum, useWeb3Store } from '@/lib/web3';

const ProviderSelect: React.FC = () => {
  const { providerType, connect } = useWeb3Store();

  return (
    <Select
      value={providerType}
      onValueChange={(value) => connect(value as ProviderTypeEnum)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Provider" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ProviderTypeEnum.METAMASK}>Metamask</SelectItem>
        <SelectItem value={ProviderTypeEnum.INFURA}>Infura</SelectItem>
      </SelectContent>
    </Select>
  );
};

export { ProviderSelect };
