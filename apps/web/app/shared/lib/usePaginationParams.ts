'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

type PaginationParamsOptions = {
  pageParam?: string;
};

export function usePaginationParams({
  pageParam = 'page',
}: PaginationParamsOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveInt(searchParams.get(pageParam), 1);

  const updatePagination = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(pageParam, String(Math.max(1, nextPage)));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pageParam, pathname, router, searchParams],
  );

  return useMemo(
    () => ({
      page,
      setPage: (nextPage: number) => updatePagination(nextPage),
    }),
    [page, updatePagination],
  );
}
