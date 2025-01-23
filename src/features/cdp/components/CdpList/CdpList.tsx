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
  const { data, searchId, isLoading, error, searchNearbyCdp, nearbyIds } =
    useSearchNearbyCdp();

  const handleSearch = (id: number, collateralType?: CollateralTypeEnum) => {
    searchNearbyCdp(id, collateralType);
  };

  useEffect(() => {
    getCollateralsTypeRate();
  }, [getCollateralsTypeRate]);

  if (!isConnected) {
    return <div className="text-center">Please connect your wallet</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }

  return (
    <>
      <div className="py-4">
        <CdpSearch onSearch={handleSearch} />
      </div>

      <div className="w-full h-1 mb-4 bg-gray-200 rounded">
        {isLoading && (
          <div
            className="h-full bg-blue-500 rounded transition-all duration-500"
            style={{
              width: `${(data.size / nearbyIds.length) * 100}%`,
            }}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-auto">
        {searchId && data.has(searchId) && (
          <CdpCard
            key={searchId}
            {...data.get(searchId)!}
            rate={collateralRates.get(data.get(searchId)!.ilk)}
          />
        )}

        {Array.from(data.entries()).map(
          ([id, data]) =>
            id !== searchId && (
              <CdpCard
                key={id}
                {...data}
                rate={collateralRates.get(data.ilk)}
              />
            ),
        )}

        {isLoading &&
          Array.from({ length: nearbyIds.length }).map((_, i) => (
            <CdpCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>
    </>
  );
};

export { CdpList };
