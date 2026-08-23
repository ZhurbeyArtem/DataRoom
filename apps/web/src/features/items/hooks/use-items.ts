import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { itemsApi } from '../api/items';

/**
 * The key is built from the folder being listed. For a root that is the room
 * id, since we have no concrete parentId yet — the server finds the root
 * itself.
 */
export function itemsKey(scopeId: string) {
  return ['items', scopeId] as const;
}

export function itemKey(itemId: string) {
  return ['item', itemId] as const;
}

interface Scope {
  dataRoomId?: string;
  parentId?: string;
}

/**
 * Cursor pagination maps onto useInfiniteQuery one to one: the server
 * returns nextCursor and we hand it back from getNextPageParam. There are no
 * page numbers and none are needed — a file manager is scrolled, not paged.
 */
export function useItemsList(scope: Scope) {
  const scopeId = scope.parentId ?? scope.dataRoomId ?? '';

  return useInfiniteQuery({
    queryKey: itemsKey(scopeId),
    enabled: scopeId !== '',
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => itemsApi.list({ ...scope, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (result) => ({
      items: result.pages.flatMap((page) => page.data),
      pages: result.pages,
      pageParams: result.pageParams,
    }),
  });
}

/** An item together with its ancestor chain — both in a single request. */
export function useItem(itemId: string | undefined) {
  return useQuery({
    queryKey: itemKey(itemId ?? ''),
    enabled: itemId !== undefined,
    queryFn: () => itemsApi.get(itemId as string),
  });
}
