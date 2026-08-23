import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/items';
import { itemKey, itemsKey } from './use-items';

/**
 * Only the folders whose contents actually changed are invalidated. Wiping
 * the whole cache would mean reloading screens the change never touched.
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
    // scopeId is the key the currently open listing sits under: for a root
    // that is the room id rather than a folder id, because that is how it was
    // requested.
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
      // Both folders changed — the one it came from and the one it went to.
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
 * Subtree stats are fetched only while the delete dialog is open: asking for
 * them per row of the listing would be wasted work.
 */
export function useSubtreeStats(itemId: string | null) {
  return useQuery({
    queryKey: ['item-stats', itemId],
    enabled: itemId !== null,
    queryFn: () => itemsApi.stats(itemId as string),
    staleTime: 0,
  });
}
