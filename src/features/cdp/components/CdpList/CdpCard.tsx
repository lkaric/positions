import { useMemo } from 'react';
import { type MatchPrimitiveType } from 'web3';

import { CopyButton } from '@/components';
import { bytesToString, formatNumber, formatWeiValue } from '@/utils';

import { type CdpData } from '../../types';

interface CdpCardProps extends CdpData {
  rate?: MatchPrimitiveType<'uint256', unknown>;
}

export const CdpCard: React.FC<CdpCardProps> = ({
  id,
  rate,
  urn,
  collateral,
  ilk,
  owner,
  debt,
  userAddr,
}) => {
  const formattedDebt = useMemo(() => {
    if (!rate) return '0';

    const value = (BigInt(debt) * BigInt(rate)) / BigInt(10 ** 27);
    const formattedValue = formatWeiValue(value);

    return `${formatNumber(Number(formattedValue), 2)} DAI`;
  }, [rate, debt]);

  const formattedCollateral = useMemo(() => {
    const value = formatWeiValue(collateral);
    console.log({ value: Number(value) });

    return `${formatNumber(Number(value), 3)} ETH`;
  }, [collateral]);

  return (
    <div className="p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white shadow-sm">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">CDP #{id}</h2>
          <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
            {bytesToString(ilk)}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            {[
              { label: 'URN', value: urn },
              { label: 'Owner', value: owner },
              { label: 'User Address', value: userAddr },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-sm font-medium text-gray-500">{label}</div>
                <div className="mt-1 text-sm text-gray-900 break-all flex justify-between sm:items-center sm:w-[70%]">
                  {value} <CopyButton value={value} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="text-sm font-medium text-gray-500">
                Collateral
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {formattedCollateral}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="text-sm font-medium text-gray-500">Debt</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {formattedDebt}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
