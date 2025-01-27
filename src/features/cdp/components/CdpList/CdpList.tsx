import { useEffect } from 'react';

import { CollateralTypeEnum, useWeb3Store } from '@/lib/web3';

import { useGetCollateralTypeRate, useSearchNearbyCdp } from '../../api';

import { CdpSearch } from '../CdpSearch';

import { CdpCardSkeleton } from './CdpCardSkeleton';
import { CdpCard } from './CdpCard';

const CdpList: React.FC = () => {
  const { isConnected } = useWeb3Store();
  const { data: collateralRates, getCollateralsTypeRate } =
    useGetCollateralTypeRate();
  const {
    searchId,
    searchData,
    isSearchLoading,
    searchError,
    size,
    searchProgress,
    searchNearbyCdps,
  } = useSearchNearbyCdp();

  const handleSearch = (id: number, collateralType?: CollateralTypeEnum) => {
    searchNearbyCdps(id, collateralType);
  };

  useEffect(() => {
    if (isConnected) {
      getCollateralsTypeRate();
    }
  }, [getCollateralsTypeRate, isConnected]);

  if (!isConnected) {
    return <div className="text-center">Please connect your wallet</div>;
  }

  if (searchError) {
    return <div className="text-red-500">Error: {searchError.message}</div>;
  }

  return (
    <>
      <div className="py-4">
        <CdpSearch onSearch={handleSearch} />
      </div>

      <div className="w-full h-1 mb-4 bg-gray-200 rounded">
        {isSearchLoading && (
          <div
            className="h-full bg-blue-500 rounded transition-all duration-500"
            style={{
              width: `${searchProgress}%`,
            }}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-auto">
        {searchId && searchData.has(searchId) && (
          <CdpCard
            key={searchId}
            {...searchData.get(searchId)!}
            rate={collateralRates.get(searchData.get(searchId)!.ilk)}
          />
        )}

        {Array.from(searchData.entries()).map(
          ([id, data]) =>
            id !== searchId && (
              <CdpCard
                key={id}
                {...data}
                rate={collateralRates.get(data.ilk)}
              />
            ),
        )}

        {isSearchLoading &&
          Array.from({ length: size }).map((_, i) => (
            <CdpCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>
    </>
  );
};

export { CdpList };
