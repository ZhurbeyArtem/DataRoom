import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/items';
import { itemKey, itemsKey } from './use-items';

/**
 * Інвалідуємо лише ті папки, вміст яких реально змінився. Скидати весь кеш
 * означало б перезавантажувати екрани, яких зміна не торкнулась.
 */
function useRefreshFolders() {
  const client = useQueryClient();

  return (...folderIds: (string | null | undefined)[]) => {
    for (const id of folderIds) {
      if (id) void client.invalidateQueries({ queryKey: itemsKey(id) });
    }
  };
}

export function useCreateFolder() {
  const refresh = useRefreshFolders();

  return useMutation({
    mutationFn: (input: { parentId: string; name: string; scopeId: string }) =>
      itemsApi.createFolder({ parentId: input.parentId, name: input.name }),
    // scopeId — те, під яким ключем лежить відкритий зараз лістинг: для кореня
    // це id кімнати, а не папки, бо саме так ми його й запитували.
    onSuccess: (_item, input) => refresh(input.scopeId),
  });
}

export function useRenameItem() {
  const refresh = useRefreshFolders();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; name: string; scopeId: string }) =>
      itemsApi.rename(input.id, input.name),
    onSuccess: (_item, input) => {
      refresh(input.scopeId);
      void client.invalidateQueries({ queryKey: itemKey(input.id) });
    },
  });
}

export function useMoveItem() {
  const refresh = useRefreshFolders();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; to: string; scopeId: string }) =>
      itemsApi.move(input.id, input.to),
    onSuccess: (_item, input) => {
      // Змінився вміст обох папок — і звідки взяли, і куди поклали.
      refresh(input.scopeId, input.to);
      void client.invalidateQueries({ queryKey: itemKey(input.id) });
    },
  });
}

export function useDeleteItem() {
  const refresh = useRefreshFolders();

  return useMutation({
    mutationFn: (input: { id: string; scopeId: string }) => itemsApi.remove(input.id),
    onSuccess: (_void, input) => refresh(input.scopeId),
  });
}

/**
 * Статистика піддерева тягнеться лише коли діалог видалення відкритий:
 * запитувати її для кожного рядка списку було б марною роботою.
 */
export function useSubtreeStats(itemId: string | null) {
  return useQuery({
    queryKey: ['item-stats', itemId],
    enabled: itemId !== null,
    queryFn: () => itemsApi.stats(itemId as string),
    staleTime: 0,
  });
}
