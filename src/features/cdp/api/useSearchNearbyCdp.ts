import { useCallback, useState, useRef } from 'react';

import { CollateralTypeEnum, useWeb3Store } from '@/lib/web3';

import { bytesToString, delay } from '@/utils';

import { CDP_ABI } from '../constants';

import { type CdpData } from '../types';

interface UseSearchNearbyCdpOptions {
  size?: number;
  batchSize?: number;
  batchDelay?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseSearchNearbyCdp {
  data: Map<number, CdpData>;
  isLoading: boolean;
  progress: number;
  error: Error | null;
  nearbyIds: number[];
  searchNearbyCdp: (
    cdpId: number,
    collateralType?: CollateralTypeEnum,
  ) => Promise<void>;
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

  const searchAbortController = useRef<AbortController | null>(null);

  const getContract = useCallback(() => {
    if (!client) {
      throw new Error('Web3 client is not initialized!');
    }
    return new client.eth.Contract(
      CDP_ABI,
      import.meta.env.VITE_CONTRACT_ADDRESS,
    );
  }, [client]);

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
          owner: data.owner,
          userAddr: data.userAddr,
          urn: data.urn,
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

  const generateNearbyIds = useCallback(
    (targetId: number, startOffset: number = 0): number[] => {
      const ids = new Set<number>([targetId]);
      let offset = startOffset;

      while (ids.size < size) {
        const above = targetId + offset;
        const below = targetId - offset;

        if (above > 0) ids.add(above);
        if (below > 0) ids.add(below);

        offset++;
      }

      const sortedIds = Array.from(ids)
        .sort((a, b) => a - b)
        .slice(0, size);

      console.log(
        `Generated ${sortedIds.length} nearby IDs around ${targetId}, starting from offset ${startOffset}`,
        sortedIds,
      );
      return sortedIds;
    },
    [size],
  );

  const processBatch = useCallback(
    async (
      ids: number[],
      collateralType?: CollateralTypeEnum,
    ): Promise<{ succeeded: CdpData[]; failed: number[] }> => {
      const results = await Promise.allSettled(ids.map((id) => getCdpById(id)));
      const succeeded: CdpData[] = [];
      const failed: number[] = [];

      results.forEach((result, index) => {
        const id = ids[index];
        if (result.status === 'fulfilled') {
          const cdp = result.value;
          if (
            !collateralType ||
            collateralType === CollateralTypeEnum.All ||
            bytesToString(cdp.ilk) === collateralType
          ) {
            succeeded.push(cdp);
          }
        } else {
          failed.push(id);
        }
      });

      console.log(
        `Batch processed: ${succeeded.length} succeeded, ${failed.length} failed`,
      );
      return { succeeded, failed };
    },
    [getCdpById],
  );

  const processFailedCdps = useCallback(
    async (
      failedIds: number[],
      collateralType?: CollateralTypeEnum,
    ): Promise<CdpData[]> => {
      let currentFailedIds = failedIds;
      let retryAttempt = 0;
      const succeededCdps: CdpData[] = [];

      while (currentFailedIds.length > 0 && retryAttempt < maxRetries) {
        console.log(
          `Retry attempt ${retryAttempt + 1} for ${currentFailedIds.length} CDPs`,
        );

        const retryBatchSize = Math.max(2, Math.floor(batchSize / 2));
        const nextFailedIds: number[] = [];

        for (let i = 0; i < currentFailedIds.length; i += retryBatchSize) {
          const batchIds = currentFailedIds.slice(i, i + retryBatchSize);
          const { succeeded, failed } = await processBatch(
            batchIds,
            collateralType,
          );

          succeededCdps.push(...succeeded);
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

        if (retryAttempt < maxRetries && currentFailedIds.length > 0) {
          const backoffDelay = retryDelay * Math.pow(2, retryAttempt);
          console.log(`Waiting ${backoffDelay}ms before next retry attempt`);
          await delay(backoffDelay);
        }
      }

      return succeededCdps;
    },
    [batchSize, batchDelay, maxRetries, retryDelay, processBatch],
  );

  const searchBatch = useCallback(
    async (
      targetId: number,
      offset: number,
      existingCdps: Map<number, CdpData>,
      collateralType?: CollateralTypeEnum,
      signal?: AbortSignal,
    ): Promise<Map<number, CdpData>> => {
      try {
        if (signal?.aborted) {
          throw new Error('Search aborted');
        }

        console.log(
          `Searching batch with offset ${offset}, current CDPs: ${existingCdps.size}`,
        );

        const newIds = generateNearbyIds(targetId, offset);
        setNearbyIds(newIds);

        const { succeeded, failed } = await processBatch(
          newIds,
          collateralType,
        );

        if (signal?.aborted) {
          throw new Error('Search aborted');
        }

        const retriedCdps =
          failed.length > 0
            ? await processFailedCdps(failed, collateralType)
            : [];

        if (signal?.aborted) {
          throw new Error('Search aborted');
        }

        const allCdps = [...succeeded, ...retriedCdps];
        const updatedCdps = new Map(existingCdps);
        allCdps.forEach((cdp) => updatedCdps.set(cdp.id, cdp));

        setProgress((Math.min(updatedCdps.size, size) / size) * 100);

        if (updatedCdps.size >= size) {
          return updatedCdps;
        }

        await delay(batchDelay);

        if (signal?.aborted) {
          throw new Error('Search aborted');
        }

        return searchBatch(
          targetId,
          offset + size,
          updatedCdps,
          collateralType,
          signal,
        );
      } catch (err) {
        if (err instanceof Error && err.message === 'Search aborted') {
          console.log('Search was aborted');
          throw err;
        }
        throw err;
      }
    },
    [generateNearbyIds, processBatch, processFailedCdps, batchDelay, size],
  );

  const searchNearbyCdp = useCallback(
    async (id: number, collateralType?: CollateralTypeEnum) => {
      // Abort previous search if exists
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }

      // Create new abort controller for this search
      searchAbortController.current = new AbortController();
      const { signal } = searchAbortController.current;

      setSearchId(id);
      setIsLoading(true);
      setData(new Map());
      setProgress(0);
      setError(null);

      try {
        const result = await searchBatch(
          id,
          0,
          new Map(),
          collateralType,
          signal,
        );

        if (!signal.aborted) {
          const sortedCdps = Array.from(result.entries())
            .sort(([a], [b]) => Math.abs(a - id) - Math.abs(b - id))
            .slice(0, size);

          setData(new Map(sortedCdps));
          setProgress(100);
          console.log('CDP search completed');
        }
      } catch (err) {
        if (!signal.aborted) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to fetch CDPs';
          console.error('CDP search failed:', errorMessage);
          setError(new Error(errorMessage));
        }
      } finally {
        if (searchAbortController.current?.signal === signal) {
          searchAbortController.current = null;
          setIsLoading(false);
        }
      }
    },
    [searchBatch, size],
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
