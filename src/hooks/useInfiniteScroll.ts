import { useEffect, useRef } from 'react';

type InfiniteScrollOptions = {
  enabled: boolean;
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
};

export function useInfiniteScroll({ enabled, hasNextPage, isFetching, onLoadMore, rootMargin = '240px' }: InfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetching) {
          onLoadMore();
        }
      },
      { rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, isFetching, onLoadMore, rootMargin]);

  return sentinelRef;
}
