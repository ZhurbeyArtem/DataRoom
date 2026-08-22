import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { itemsApi } from '../api/items';

export function useSearch(dataRoomId: string, rawQuery: string) {
  const q = useDebouncedValue(rawQuery.trim());

  const query = useInfiniteQuery({
    queryKey: ['search', dataRoomId, q],
    // Порожній рядок не має слати запит: інакше саме відкриття поля
    // тягнуло б повний лістинг кімнати.
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

  // Поки дебаунс не спрацював, показуємо стан завантаження: інакше після
  // першої ж літери на секунду блимало б «нічого не знайдено».
  const settling = rawQuery.trim() !== q;

  return { ...query, settling, effectiveQuery: q };
}
