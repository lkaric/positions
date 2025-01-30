import { useCallback, useState, useRef, useMemo } from 'react';

import { CollateralTypeEnum, useWeb3Store } from '@/lib/web3';

import { bytesToString, delay } from '@/utils';

import { CDP_ABI } from '../constants';

import { type CdpData } from '../types';

interface UseSearchNearbyCdpOptions {
  size?: number;
  batchSize?: number;
  batchDelay?: number;
}

interface UseSearchNearbyCdp {
  searchId: number | null;
  searchData: CdpData[];
  searchIds: number[];
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
  const { size = 20, batchSize = 5, batchDelay = 500 } = options || {};

  const { client } = useWeb3Store();

  const [data, setData] = useState<Map<number, CdpData>>(new Map());
  const [searchIds, setSearchIds] = useState<number[]>([]);
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
      .map(([, data]) => data);
  }, [data, searchId]);

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
      offset: number = 0,
      existing: number[] = [],
    ): number[] => {
      const ids = new Set<number>();
      const existingIds = new Set(existing);

      const range = Math.floor((size + offset) / 2);

      for (let i = 0; i <= range; i++) {
        const prev = targetId - i;
        const next = targetId + i;

        if (!existingIds.has(prev)) ids.add(prev);
        if (!existingIds.has(next)) ids.add(next);
      }

      const sortedIds = Array.from(ids).sort((a, b) => b - a);

      console.log(
        `Generating IDs for batch (targetId=${targetId}, offset=${offset}, range=${range}):`,
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
    ) => {
      const success: number[] = [];
      const failure: number[] = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        let batchSuccess = 0;
        let batchFailure = 0;

        if (signal?.aborted) throw new Error('Search aborted');

        const batchIds = ids.slice(i, i + batchSize);

        console.group(`Fetching batch:`, batchIds);

        const response = await Promise.all(batchIds.map(fetchCdp));

        response.forEach((cdp) => {
          if (filterCdp(cdp, collateralType)) {
            success.push(cdp.id);
            batchSuccess++;
            setData((current) => {
              const newData = new Map(current.set(cdp.id, cdp));
              setSearchProgress(Math.min((newData.size / size) * 100, 100));
              return newData;
            });
          } else {
            failure.push(cdp.id);
            batchFailure++;
          }
        });

        if (i + batchSize < ids.length) {
          await delay(batchDelay);
        }

        console.log(
          `Batch finished (success=${batchSuccess}, failure=${batchFailure})`,
        );

        console.groupEnd();
      }

      return { success, failure };
    },
    [batchDelay, batchSize, fetchCdp, filterCdp, size],
  );

  const search = useCallback(
    async (
      id: number,
      collateralType?: CollateralTypeEnum,
      signal?: AbortSignal,
    ) => {
      const generatedIds = generateNearbyIds(id, 0);
      setSearchIds(generatedIds);

      if (signal?.aborted) throw new Error('Search aborted');

      const { success: initialBatchSuccess } = await processBatch(
        generatedIds,
        collateralType,
        signal,
      );

      let offset = batchSize + 1;
      let existingIds = [...generatedIds];
      let currentCount = initialBatchSuccess.length;

      while (currentCount < size) {
        const ids = generateNearbyIds(id, offset, existingIds);

        const { success } = await processBatch(ids, collateralType, signal);

        await delay(batchDelay);

        existingIds = [...existingIds, ...ids];
        offset += batchSize;
        currentCount += success.length;
      }

      console.log('Finished search');
    },
    [batchDelay, batchSize, generateNearbyIds, processBatch, size],
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
        setSearchProgress(0);
        setIsSearchLoading(true);
        setData(new Map());
        setSearchError(null);

        await search(id, collateralType, abortController.signal);

        setIsSearchLoading(false);
        setSearchProgress(0);
      } catch (err) {
        if (!abortController.signal.aborted) {
          setSearchError(
            err instanceof Error ? err : new Error('Failed to fetch CDPs'),
          );
        }

        console.log(`Aborted (searchId=${id})`);
      } finally {
        if (searchAbortController.current === abortController) {
          searchAbortController.current = null;
        }
      }
    },
    [search],
  );

  return {
    searchId,
    searchIds,
    searchData,
    isSearchLoading,
    searchProgress,
    searchError,
    size,
    searchNearbyCdps,
  };
};

export { useSearchNearbyCdp };
