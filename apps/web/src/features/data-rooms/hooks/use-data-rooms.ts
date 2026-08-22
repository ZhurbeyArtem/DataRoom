import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataRoomsApi } from '../api/data-rooms';

export const dataRoomsKey = ['data-rooms'] as const;

export function useDataRooms() {
  return useQuery({
    queryKey: dataRoomsKey,
    queryFn: dataRoomsApi.list,
  });
}

function useRefreshRooms() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: dataRoomsKey });
}

export function useCreateRoom() {
  const refresh = useRefreshRooms();

  return useMutation({
    mutationFn: (name: string) => dataRoomsApi.create(name),
    onSuccess: refresh,
  });
}

export function useRenameRoom() {
  const refresh = useRefreshRooms();

  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      dataRoomsApi.rename(input.id, input.name),
    onSuccess: refresh,
  });
}

export function useDeleteRoom() {
  const refresh = useRefreshRooms();

  return useMutation({
    mutationFn: (id: string) => dataRoomsApi.remove(id),
    onSuccess: refresh,
  });
}
