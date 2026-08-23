import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { itemsApi } from '../api/items';

export function useSearch(dataRoomId: string, rawQuery: string) {
  const q = useDebouncedValue(rawQuery.trim());

  const query = useInfiniteQuery({
    queryKey: ['search', dataRoomId, q],
    // An empty string must not fire a request: otherwise merely opening the
    // field would pull the whole room listing.
    enabled: q.length > 0,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => itemsApi.search({ dataRoomId, q, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (result) => ({
      items: result.pages.flatMap((page) => page.data),
      pages: result.pages,
      pageParams: result.pageParams,
    }),
  });

  // While the debounce has not fired yet, show the loading state: otherwise
  // "nothing found" would flash for a second after the very first letter.
  const settling = rawQuery.trim() !== q;

  return { ...query, settling, effectiveQuery: q };
}
