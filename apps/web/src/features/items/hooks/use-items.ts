import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { itemsApi } from '../api/items';

/**
 * Ключ будується від папки, вміст якої показуємо. Для кореня це id кімнати,
 * бо конкретного parentId у нас ще немає — сервер сам знайде корінь.
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
 * Курсорна пагінація лягає на useInfiniteQuery один в один: сервер віддає
 * nextCursor, ми повертаємо його з getNextPageParam. Номерів сторінок немає
 * і не треба — у файловому менеджері гортають скролом.
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

/** Елемент разом із ланцюжком предків — обидва приходять одним запитом. */
export function useItem(itemId: string | undefined) {
  return useQuery({
    queryKey: itemKey(itemId ?? ''),
    enabled: itemId !== undefined,
    queryFn: () => itemsApi.get(itemId as string),
  });
}
