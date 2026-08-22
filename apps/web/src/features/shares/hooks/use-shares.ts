import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateShareInput } from '@/types/api';
import { sharesApi } from '../api/shares';

export const sharesKey = (itemId: string) => ['shares', itemId] as const;
export const sharedWithMeKey = ['shares', 'with-me'] as const;

export function useShares(itemId: string | null) {
  return useQuery({
    queryKey: sharesKey(itemId ?? ''),
    enabled: itemId !== null,
    queryFn: () => sharesApi.listForItem(itemId as string),
  });
}

export function useCreateShare(itemId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateShareInput) => sharesApi.create(itemId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: sharesKey(itemId) }),
  });
}

export function useRevokeShare(itemId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (shareId: string) => sharesApi.revoke(shareId),
    onSuccess: () => client.invalidateQueries({ queryKey: sharesKey(itemId) }),
  });
}

export function useSharedWithMe() {
  return useQuery({ queryKey: sharedWithMeKey, queryFn: sharesApi.withMe });
}
