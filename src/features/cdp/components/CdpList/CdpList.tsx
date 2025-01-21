import { useWeb3Store } from '@/lib/web3';

import { useSearchNearbyCdp } from '../../api';

import { CdpSearch } from '../CdpSearch';

import { CdpCardSkeleton } from './CdpCardSkeleton';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CdpCard = ({ id, data }: any) => {
  // Financial information with proper formatting
  const financialInfo = [
    {
      label: 'Collateral',
      value: `${data.collateral} ${data.ilk.split('-')[0]}`, // Extract token name from ilk
    },
    {
      label: 'Debt',
      value: `${data.debt} DAI`,
    },
  ];

  return (
    <div className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white shadow-sm">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">CDP #{id}</h2>
          <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
            {data.ilk}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Address Information */}
          <div className="space-y-2">
            {[
              { label: 'URN', value: data.urn },
              { label: 'Owner', value: data.owner },
              { label: 'User Address', value: data.userAddr },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-sm font-medium text-gray-500">{label}</div>
                <div className="mt-1 text-sm text-gray-900 break-all">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            {financialInfo.map(({ label, value }) => (
              <div key={label} className="p-4 rounded-lg bg-gray-50">
                <div className="text-sm font-medium text-gray-500">{label}</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CdpList: React.FC = () => {
  const { isConnected } = useWeb3Store();
  const { data, isLoading, error, searchNearbyCdp, nearbyIds } =
    useSearchNearbyCdp();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSearch = (id: number, collateralType: string) => {
    searchNearbyCdp(id);
  };

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

      <div className="flex flex-col gap-2 overflow-auto">
        {Array.from(data.entries()).map(([id, data]) => (
          <CdpCard key={id} id={id} data={data} />
        ))}

        {/* Show skeletons for loading state */}
        {isLoading &&
          Array.from({ length: nearbyIds.length }).map((_, i) => (
            <CdpCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>
    </>
  );
};

export { CdpList };
