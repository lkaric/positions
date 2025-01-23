import { useCallback, useState } from 'react';
import { type MatchPrimitiveType } from 'web3';

import { CollateralTypeEnum, useWeb3Store } from '@/lib/web3';

import { CDP_MANAGER_ABI, ILKS_COLLATERAL_TYPE_MAP } from '../constants';

const useGetCollateralTypeRate = () => {
  const { client } = useWeb3Store();
  const [data, setData] = useState<
    Map<
      MatchPrimitiveType<'bytes32', unknown>,
      MatchPrimitiveType<'uint256', unknown>
    >
  >(new Map());

  const getContract = useCallback(() => {
    if (!client) {
      throw new Error('Web3 client is not initialized!');
    }

    return new client.eth.Contract(
      CDP_MANAGER_ABI,
      import.meta.env.VITE_MANAGER_CONTRACT_ADDRESS,
    );
  }, [client]);

  const getCollateralsTypeRate = useCallback(async () => {
    const contract = getContract();

    const collateralTypes = Object.values(ILKS_COLLATERAL_TYPE_MAP).filter(
      (item) => item !== '',
    ) as CollateralTypeEnum[];

    const requests = collateralTypes.map((ilk) =>
      contract.methods.ilks(ilk).call(),
    );

    const response = await Promise.all(requests);

    response.forEach((result, idx) => {
      setData((data) => new Map(data.set(collateralTypes[idx], result.rate)));
    });
  }, [getContract]);

  return {
    data,
    getCollateralsTypeRate,
  };
};

export { useGetCollateralTypeRate };
