import { useCallback, useState } from 'react';

import { CollateralTypeEnum, useWeb3Store } from '@/lib/web3';

import { delay } from '@/utils';

import { CDP_ABI } from '../constants';

import { type CdpData } from '../types';

interface UseSearchNearbyCdpOptions {
  size?: number;
  batchSize?: number;
  batchDelay?: number;
  maxRetries?: number;
  retryDelay?: number;
  collateralType?: CollateralTypeEnum;
}

interface UseSearchNearbyCdp {
  data: Map<number, CdpData>;
  isLoading: boolean;
  progress: number;
  error: Error | null;
  nearbyIds: number[];
  searchNearbyCdp: (cdpId: number) => Promise<void>;
  searchId: number | null;
}

const useSearchNearbyCdp = (
  options?: UseSearchNearbyCdpOptions,
): UseSearchNearbyCdp => {
  const {
    size = 5,
    batchSize = 5,
    batchDelay = 3000,
    maxRetries = 3,
    retryDelay = 3000,
  } = options || {};

  const { client } = useWeb3Store();

  const [data, setData] = useState<Map<number, CdpData>>(new Map());
  const [searchId, setSearchId] = useState<number | null>(null);
  const [nearbyIds, setNearbyIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const getContract = useCallback(() => {
    if (!client) {
      throw new Error('Web3 client is not initialized!');
    }

    return new client.eth.Contract(
      CDP_ABI,
      import.meta.env.VITE_CONTRACT_ADDRESS,
    );
  }, [client]);

  const generateNearbyIds = useCallback(
    (targetId: number): number[] => {
      const ids = [
        targetId,
        ...Array.from({ length: size }, (_, i) => {
          const offset = Math.floor(i / 2) + 1;
          return i % 2 === 0 ? targetId + offset : targetId - offset;
        }),
      ]
        .filter((id) => id > 0)
        .sort((a, b) => a - b);

      console.log(`Generated ${ids.length} nearby IDs around ${targetId}`);
      return ids;
    },
    [size],
  );

  const getCdpById = useCallback(
    async (id: number) => {
      try {
        const contract = getContract();

        console.log(`Fetching CDP ${id}`);

        const data = await contract.methods.getCdpInfo(id).call();

        const cdpData: CdpData = {
          id,
          ...data,
          ilk: data.ilk,
          collateral: data.collateral,
          debt: data.debt,
        };

        console.log(`Successfully fetched CDP ${id}`);

        return cdpData;
      } catch (err) {
        console.error('Failed to fetch CDP data for ID:', id);
        throw err;
      }
    },
    [getContract],
  );

  const processBatch = useCallback(
    async (
      ids: number[],
    ): Promise<{
      succeeded: number[];
      failed: number[];
    }> => {
      const results = await Promise.allSettled(ids.map((id) => getCdpById(id)));

      const succeeded: number[] = [];
      const failed: number[] = [];

      results.forEach((result, index) => {
        const id = ids[index];

        if (result.status === 'fulfilled') {
          setData((data) => new Map(data.set(id, result.value)));
          succeeded.push(id);
        } else {
          failed.push(ids[index]);
        }
      });

      console.log(
        `Batch processed: ${succeeded.length} succeeded, ${failed.length} failed`,
      );

      return { failed, succeeded };
    },
    [getCdpById],
  );

  const processFailedCdps = useCallback(
    async (failedIds: number[]): Promise<number[]> => {
      let currentFailedIds = failedIds;
      let retryAttempt = 0;

      while (currentFailedIds.length > 0 && retryAttempt < maxRetries) {
        console.log(
          `Retry attempt ${retryAttempt + 1} for ${currentFailedIds.length} CDPs`,
        );

        const retryBatchSize = Math.max(2, Math.floor(batchSize / 2));
        const nextFailedIds: number[] = [];

        for (let i = 0; i < currentFailedIds.length; i += retryBatchSize) {
          const batchIds = currentFailedIds.slice(i, i + retryBatchSize);

          const { failed } = await processBatch(batchIds);

          nextFailedIds.push(...failed);

          if (i + retryBatchSize < currentFailedIds.length) {
            await delay(batchDelay);
          }
        }

        currentFailedIds = nextFailedIds;
        retryAttempt++;

        if (currentFailedIds.length === 0) {
          console.log('All CDPs successfully fetched after retries');

          break;
        }

        if (retryAttempt < maxRetries) {
          const backoffDelay = retryDelay * Math.pow(2, retryAttempt);

          console.log(`Waiting ${backoffDelay}ms before next retry attempt`);

          await delay(backoffDelay);
        }
      }

      return currentFailedIds;
    },
    [batchSize, batchDelay, maxRetries, retryDelay, processBatch],
  );

  const searchNearbyCdp = useCallback(
    async (id: number) => {
      const ids = generateNearbyIds(id);
      setSearchId(id);
      setIsLoading(true);
      setData(new Map());
      setNearbyIds(ids);

      let failedIds: number[] = [];

      try {
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);

          const { failed } = await processBatch(batch);

          failedIds.push(...failed);

          setProgress(((i + batchSize) / ids.length) * 100);

          if (i + batchSize < ids.length) {
            await delay(batchDelay);
          }
        }

        if (failedIds.length > 0) {
          failedIds = await processFailedCdps(failedIds);

          if (failedIds.length > 0) {
            console.warn(
              `Failed to fetch ${failedIds.length} CDPs after all retries`,
            );
          }
        }

        console.log('CDP fetch completed');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch CDPs';

        console.error('CDP fetch failed:', errorMessage);

        setError(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    },
    [batchDelay, batchSize, generateNearbyIds, processBatch, processFailedCdps],
  );

  return {
    data,
    searchId,
    isLoading,
    progress,
    error,
    nearbyIds,
    searchNearbyCdp,
  };
};

export { useSearchNearbyCdp };
