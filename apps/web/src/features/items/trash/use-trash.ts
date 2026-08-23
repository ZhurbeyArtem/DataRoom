import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/items';
import { itemsKey } from '../hooks/use-items';

export const trashKey = (roomId: string) => ['trash', roomId] as const;

export function useTrash(roomId: string) {
  return useQuery({
    queryKey: trashKey(roomId),
    queryFn: () => itemsApi.trash(roomId),
  });
}

export function useRestoreItem(roomId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => itemsApi.restore(itemId),
    onSuccess: (restored) => {
      void client.invalidateQueries({ queryKey: trashKey(roomId) });
      // Refresh both the folder the item returned to and the root listing:
      // if the parent was deleted meanwhile, the server puts the item there.
      void client.invalidateQueries({ queryKey: itemsKey(restored.parentId ?? roomId) });
      void client.invalidateQueries({ queryKey: itemsKey(roomId) });
    },
  });
}
