import { useCallback, useState, useRef, useMemo } from 'react';

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
  searchData: CdpData[];
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

  const [data, setData] = useState<Map<number, CdpData>>(new Map());
  const [searchId, setSearchId] = useState<number | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchError, setSearchError] = useState<Error | null>(null);

  const searchAbortController = useRef<AbortController | null>(null);

  const searchData = useMemo(() => {
    return Array.from(data.entries())
      .sort(([idA], [idB]) => {
        if (idA === searchId) return -1;
        if (idB === searchId) return 1;

        return idB - idA;
      })
      .slice(0, size)
      .map(([, data]) => data);
  }, [data, searchId, size]);

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
    (
      targetId: number,
      startOffset: number = 0,
      existing: Map<number, CdpData>,
    ): number[] => {
      const ids = new Set<number>();
      const halfSize = Math.floor((size - 1) / 2);

      if (startOffset === 0) {
        ids.add(targetId);

        for (let i = 1; i <= halfSize + 1; i++) {
          const id = targetId + i;
          if (!existing.has(id)) ids.add(id);
        }

        for (let i = 0; i <= halfSize + 1; i++) {
          const id = targetId - i;
          if (id > 0 && !existing.has(id)) ids.add(id);
        }
      } else {
        const upperStart = targetId + halfSize + 1 + startOffset;
        const lowerStart = targetId - halfSize - startOffset;

        for (
          let i = upperStart;
          i < upperStart + batchSize && ids.size < batchSize;
          i++
        ) {
          if (!existing.has(i)) {
            ids.add(i);
          }
        }

        for (
          let i = lowerStart;
          i > lowerStart - batchSize && ids.size < batchSize;
          i--
        ) {
          if (i > 0 && !existing.has(i)) {
            ids.add(i);
          }
        }
      }

      const sortedIds = Array.from(ids)
        .sort((a, b) => b - a)
        .slice(0, startOffset === 0 ? size + 1 : batchSize);

      console.log(
        `Generating IDs for batch (targetId=${targetId}, startOffset=${startOffset}):`,
        sortedIds,
      );
      return sortedIds;
    },
    [size, batchSize],
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
        const contract = getContract();

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
    [getContract],
  );

  const processBatch = useCallback(
    async (
      ids: number[],
      collateralType?: CollateralTypeEnum,
      signal?: AbortSignal,
    ): Promise<{ succeeded: CdpData[]; failed: number[] }> => {
      if (signal?.aborted) throw new Error('Search aborted');

      console.group('Batch');
      const fetchPromise = Promise.allSettled(ids.map(fetchCdp));

      // Note: This is an overkill to ensure that we can abort the batch process; Will work w/o this.
      let abortHandler: () => void;
      const abortPromise = new Promise<never>((_, reject) => {
        abortHandler = () => reject(new Error('Search aborted'));
        signal?.addEventListener('abort', abortHandler);
      }).finally(() => {
        signal?.removeEventListener('abort', abortHandler!);
      });

      const results = await Promise.race([fetchPromise, abortPromise]);
      const succeeded: CdpData[] = [];
      const failed: number[] = [];

      results.forEach((result, index) => {
        const id = ids[index];
        if (signal?.aborted) throw new Error('Search aborted');

        if (result.status === 'fulfilled') {
          const cdp = result.value;

          if (filterCdp(cdp, collateralType)) {
            succeeded.push(cdp);
            setData((current) => {
              const newData = new Map(current.set(cdp.id, cdp));
              setSearchProgress(Math.min((newData.size / size) * 100, 100));
              return newData;
            });
          }
        } else {
          failed.push(id);
          console.log(`Failed to fetch CDP ${id}`);
        }
      });

      console.log('Batch results:', { succeeded, failed });
      console.groupEnd();
      return { succeeded, failed };
    },
    [fetchCdp, filterCdp, size],
  );

  const processIds = useCallback(
    async (
      ids: number[],
      collateralType?: CollateralTypeEnum,
      signal?: AbortSignal,
    ): Promise<{ succeeded: CdpData[]; failed: number[] }> => {
      if (signal?.aborted) throw new Error('Search aborted');

      const succeeded: CdpData[] = [];
      const failed: number[] = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        if (signal?.aborted) throw new Error('Search aborted');

        const batchIds = ids.slice(i, i + batchSize);
        const { succeeded: batchSucceeded, failed: batchFailed } =
          await processBatch(batchIds, collateralType, signal);

        succeeded.push(...batchSucceeded);
        failed.push(...batchFailed);

        if (i + batchSize < ids.length) {
          if (signal?.aborted) throw new Error('Search aborted');
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
      signal?: AbortSignal,
    ): Promise<CdpData[]> => {
      if (signal?.aborted) throw new Error('Search aborted');

      let currentIds = [...ids];
      let retryAttempt = 0;
      const succeeded: CdpData[] = [];

      console.log(`Retrying failed IDs: ${currentIds}`);

      while (currentIds.length > 0 && retryAttempt < maxRetries) {
        console.group(`Retry attempt ${retryAttempt + 1}/${maxRetries}`, {
          remainingIds: currentIds,
        });

        if (signal?.aborted) throw new Error('Search aborted');

        const retryBatchSize = Math.max(2, Math.floor(batchSize / 2));
        const failedIds: number[] = [];

        for (let i = 0; i < currentIds.length; i += retryBatchSize) {
          const batchIds = currentIds.slice(i, i + retryBatchSize);

          const { succeeded: retrySucceeded, failed: retryFailed } =
            await processIds(batchIds, collateralType);

          succeeded.push(...retrySucceeded);
          failedIds.push(...retryFailed);

          if (i + retryBatchSize < currentIds.length) {
            await delay(batchDelay);
          }
        }

        retryAttempt++;

        if (retryAttempt < maxRetries && currentIds.length > 0) {
          if (signal?.aborted) throw new Error('Search aborted');
          const time = retryDelay * Math.pow(2, retryAttempt);

          console.log(`Waiting for ${time}ms`);
          await delay(time);
        }

        currentIds = failedIds;

        console.groupEnd();
      }

      console.log(`Retry complete:`, {
        succeeded: succeeded.map((cdp) => cdp.id),
        remaining: currentIds,
      });

      return succeeded;
    },
    [maxRetries, batchSize, processIds, batchDelay, retryDelay],
  );

  const search = useCallback(
    async (
      id: number,
      offset: number,
      existing: Map<number, CdpData>,
      collateralType?: CollateralTypeEnum,
      signal?: AbortSignal,
    ) => {
      if (signal?.aborted) throw new Error('[1] Search aborted!');

      const generatedIds = generateNearbyIds(id, offset, existing);

      const { succeeded, failed } = await processIds(
        generatedIds,
        collateralType,
        signal,
      );

      if (signal?.aborted) throw new Error('[2] Search aborted!');

      const retriedCdps =
        failed.length > 0
          ? await processFailed(failed, collateralType, signal)
          : [];

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

      return search(
        id,
        offset + batchSize,
        updatedCdps,
        collateralType,
        signal,
      );
    },
    [processIds, processFailed, generateNearbyIds, size, batchDelay, batchSize],
  );

  const searchNearbyCdps = useCallback(
    async (id: number, collateralType?: CollateralTypeEnum) => {
      if (searchAbortController.current) {
        searchAbortController.current.abort();
        searchAbortController.current = null;
        setIsSearchLoading(false);
      }

      const abortController = new AbortController();
      searchAbortController.current = abortController;

      try {
        setSearchId(id);
        setIsSearchLoading(true);
        setData(new Map());
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
          setData(new Map(results));
          setSearchProgress(100);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setSearchError(
            err instanceof Error ? err : new Error('Failed to fetch CDPs'),
          );
        }
        console.log('Aborted');
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
