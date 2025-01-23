import { useState } from 'react';

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

import { CollateralTypeEnum } from '@/lib/web3';
import { useDebounce } from '@/utils';

interface CdpSearchProps {
  onSearch: (id: number, collateralType?: CollateralTypeEnum) => void;
}

const CdpSearch: React.FC<CdpSearchProps> = ({ onSearch }) => {
  const [cdpId, setCdpId] = useState('');
  const [collateralType, setCollateralType] = useState<CollateralTypeEnum>(
    CollateralTypeEnum.All,
  );
  const collateralTypeKeys = Object.keys(CollateralTypeEnum) as Array<
    keyof typeof CollateralTypeEnum
  >;

  const triggerSearch = (value: string, type: CollateralTypeEnum) => {
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue > 0) {
      onSearch(numericValue, type);
    }
  };

  const debouncedSearch = useDebounce(
    (value: string) => triggerSearch(value, collateralType),
    500,
  );

  const handleCdpIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setCdpId(value);
    debouncedSearch(value);
  };

  const handleCollateralTypeChange = (value: CollateralTypeEnum) => {
    setCollateralType(value);
    triggerSearch(cdpId, value);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <Select value={collateralType} onValueChange={handleCollateralTypeChange}>
        <SelectTrigger className="sm:w-[180px]">
          <SelectValue placeholder="Select Type" />
        </SelectTrigger>
        <SelectContent>
          {collateralTypeKeys.map((key) => (
            <SelectItem
              key={CollateralTypeEnum[key]}
              value={CollateralTypeEnum[key]}
            >
              {CollateralTypeEnum[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative w-full sm:w-auto">
        <Input
          type="number"
          placeholder="Search"
          value={cdpId}
          onChange={handleCdpIdChange}
        />
      </div>
    </div>
  );
};

export { CdpSearch, type CdpSearchProps };
