import { useCallback, useState, useRef } from 'react';

import { CollateralTypeEnum, useWeb3Store } from '@/lib/web3';

import { bytesToString, delay } from '@/utils';

import { CDP_ABI } from '../constants';

import { type CdpData } from '../types';

interface UseSearchNearbyCdpOptions {
  size?: number; // Maximum number of CDPs to fetch
  batchSize?: number; // Number of CDPs to fetch in parallel
  batchDelay?: number; // Delay between batch requests (ms)
  maxRetries?: number; // Maximum retry attempts for failed requests
  retryDelay?: number; // Base delay between retries (ms)
}

interface UseSearchNearbyCdp {
  searchId: number | null;
  searchData: Map<number, CdpData>;
  isSearchLoading: boolean;
  searchProgress: number;
  searchError: Error | null;
  size: number;
  searchNearbyCdps: (
    id: number,
    collateralType?: CollateralTypeEnum,
  ) => Promise<void>;
}

const useSearchNearbyCdp = (
  options?: UseSearchNearbyCdpOptions,
): UseSearchNearbyCdp => {
  const {
    size = 20,
    batchSize = 5,
    batchDelay = 3000,
    maxRetries = 3,
    retryDelay = 3000,
  } = options || {};

  const { client } = useWeb3Store();

  const [searchData, setSearchData] = useState<Map<number, CdpData>>(new Map());
  const [searchId, setSearchId] = useState<number | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchError, setSearchError] = useState<Error | null>(null);

  const searchAbortController = useRef<AbortController | null>(null);

  const generateNearbyIds = useCallback(
    (targetId: number, startOffset: number = 0): number[] => {
      const ids = new Set<number>();
      const halfSize = Math.floor(size / 2);

      if (startOffset === 0) {
        ids.add(targetId);

        for (let i = 1; i <= halfSize; i++) {
          const id = targetId - i;
          if (id > 0) ids.add(id);
        }

        for (let i = 1; i <= halfSize; i++) {
          ids.add(targetId + i);
        }
      } else {
        const rangeStart = targetId - halfSize - startOffset;
        const rangeEnd = targetId + halfSize + startOffset;

        for (let i = rangeStart; i <= rangeEnd && ids.size < size; i++) {
          if (i > 0 && i !== targetId) {
            ids.add(i);
          }
        }
      }

      const sortedIds = Array.from(ids)
        .sort((a, b) => a - b)
        .slice(0, size);

      console.log(
        `Generating IDs for batch (targetId=${targetId}, startOffset=${startOffset}):`,
        sortedIds,
      );
      return sortedIds;
    },
    [size],
  );

  const filterCdp = useCallback(
    (cdp: CdpData, collateralType?: CollateralTypeEnum): boolean => {
      return (
        !collateralType ||
        collateralType === CollateralTypeEnum.All ||
        bytesToString(cdp.ilk) === collateralType
      );
    },
    [],
  );

  const fetchCdp = useCallback(
    async (id: number): Promise<CdpData> => {
      try {
        if (!client) throw new Error('Web3 client not initialized');

        const contract = new client.eth.Contract(
          CDP_ABI,
          import.meta.env.VITE_CONTRACT_ADDRESS,
        );

        console.log(`Fetching CDP ${id}`);

        const response = await contract.methods.getCdpInfo(id).call();

        console.log(`Successfully fetched CDP ${id}`);

        return {
          id,
          ilk: response.ilk,
          collateral: response.collateral,
          debt: response.debt,
          owner: response.owner,
          userAddr: response.userAddr,
          urn: response.urn,
        };
      } catch (err) {
        console.error('Failed to fetch CDP data for ID:', id);
        throw err;
      }
    },
    [client],
  );

  const processBatch = useCallback(
    async (
      ids: number[],
      collateralType?: CollateralTypeEnum,
    ): Promise<{ succeeded: CdpData[]; failed: number[] }> => {
      console.group('Batch');
      const results = await Promise.allSettled(ids.map(fetchCdp));

      const succeeded: CdpData[] = [];
      const failed: number[] = [];

      results.forEach((result, index) => {
        const id = ids[index];

        if (
          result.status === 'fulfilled' &&
          filterCdp(result.value, collateralType)
        ) {
          succeeded.push(result.value);
          setSearchData(
            (current) => new Map(current.set(result.value.id, result.value)),
          );
          setSearchProgress(Math.min((succeeded.length / size) * 100, 100));
        } else {
          failed.push(id);
        }
      });

      console.log(`Batch finished: `, {
        succeeded: succeeded.map((cdp) => cdp.id),
        failed,
      });

      console.groupEnd();
      return { succeeded, failed };
    },
    [fetchCdp, filterCdp, size],
  );

  const processIds = useCallback(
    async (
      ids: number[],
      collateralType?: CollateralTypeEnum,
    ): Promise<{ succeeded: CdpData[]; failed: number[] }> => {
      const succeeded: CdpData[] = [];
      const failed: number[] = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);

        const { succeeded: batchSucceeded, failed: batchFailed } =
          await processBatch(batchIds, collateralType);

        succeeded.push(...batchSucceeded);
        failed.push(...batchFailed);

        if (i + batchSize < ids.length) {
          await delay(batchDelay);
        }
      }

      return { succeeded, failed };
    },
    [processBatch, batchSize, batchDelay],
  );

  const processFailed = useCallback(
    async (
      ids: number[],
      collateralType?: CollateralTypeEnum,
    ): Promise<CdpData[]> => {
      let currentIds = ids;
      let retryAttempt = 0;
      const succeeded: CdpData[] = [];

      console.log(`Retrying failed IDs: ${currentIds}`);

      while (currentIds.length > 0 && retryAttempt < maxRetries) {
        console.log(`Retry attempt ${retryAttempt + 1}/${maxRetries}`, {
          remainingIds: currentIds,
        });

        const retryBatchSize = Math.max(2, Math.floor(batchSize / 2));

        const { succeeded, failed } = await processIds(
          currentIds.slice(0, retryBatchSize),
          collateralType,
        );

        succeeded.push(...succeeded);
        currentIds = failed;

        retryAttempt++;

        if (retryAttempt < maxRetries && currentIds.length > 0) {
          const time = retryDelay * Math.pow(2, retryAttempt);

          console.log(`Waiting for ${time}ms`);
          await delay(time);
        }
      }

      console.log(`Retry complete:`, {
        succeeded: succeeded.map((cdp) => cdp.id),
        remaining: currentIds,
      });

      return succeeded;
    },
    [processIds, batchSize, maxRetries, retryDelay],
  );

  const search = useCallback(
    async (
      id: number,
      offset: number,
      existing: Map<number, CdpData>,
      collateralType?: CollateralTypeEnum,
      signal?: AbortSignal,
    ) => {
      // First abort check: Early exit if the search was already cancelled;
      if (signal?.aborted) throw new Error('[1] Search aborted!');

      const generatedIds = generateNearbyIds(id, offset);

      const { succeeded, failed } = await processIds(
        generatedIds,
        collateralType,
      );

      // Second abort check: After main batch processing during the potentially long-running processBatch;
      if (signal?.aborted) throw new Error('[2] Search aborted!');

      const retriedCdps =
        failed.length > 0 ? await processFailed(failed, collateralType) : [];

      // Third abort check: After retry operations blocks updating state and next recursion cycle if search was cancelled during retry, which can be time consuming due to the exponential backoff;
      if (signal?.aborted) throw new Error('[3] Search aborted!');

      const updatedCdps = new Map(existing);

      [...succeeded, ...retriedCdps].forEach((cdp) =>
        updatedCdps.set(cdp.id, cdp),
      );

      if (updatedCdps.size >= size) {
        console.log(`Search completed, reached target size.`);
        return updatedCdps;
      }

      console.log(`Continuing search with next batch...`);
      await delay(batchDelay);
      if (signal?.aborted) throw new Error('[4] Search aborted!');

      return search(id, offset + size, updatedCdps, collateralType, signal);
    },
    [processIds, processFailed, generateNearbyIds, size, batchDelay],
  );

  const searchNearbyCdps = useCallback(
    async (id: number, collateralType?: CollateralTypeEnum) => {
      searchAbortController.current?.abort();

      const abortController = new AbortController();
      searchAbortController.current = abortController;

      try {
        setSearchId(id);
        setIsSearchLoading(true);
        setSearchData(new Map());
        setSearchProgress(0);
        setSearchError(null);

        const results = await search(
          id,
          0,
          new Map(),
          collateralType,
          abortController.signal,
        );

        if (!abortController.signal.aborted) {
          setSearchData(new Map(results));
          setSearchProgress(100);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setSearchError(
            err instanceof Error ? err : new Error('Failed to fetch CDPs'),
          );
        }
      } finally {
        if (searchAbortController.current === abortController) {
          searchAbortController.current = null;
          setIsSearchLoading(false);
        }
      }
    },
    [search],
  );

  return {
    searchId,
    searchData,
    isSearchLoading,
    searchProgress,
    searchError,
    size,
    searchNearbyCdps,
  };
};

export { useSearchNearbyCdp };
