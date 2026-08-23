import { useQuery } from '@tanstack/react-query';
import { itemsApi } from '../api/items';

/** The server signs the link for 60 seconds. */
const SIGNATURE_TTL_MS = 60_000;

/**
 * It must not be cached for long: the link expires, and reopening the
 * dialog would hand out a dead URL. So its cache lifetime is deliberately
 * shorter than the signature's.
 */
export function useDownloadUrl(itemId: string | null) {
  return useQuery({
    queryKey: ['download-url', itemId],
    enabled: itemId !== null,
    queryFn: () => itemsApi.downloadUrl(itemId as string),
    staleTime: SIGNATURE_TTL_MS / 2,
    gcTime: SIGNATURE_TTL_MS / 2,
    retry: false,
  });
}
