import { useQuery } from '@tanstack/react-query';
import { itemsApi } from '../api/items';

/** Сервер підписує посилання на 60 секунд. */
const SIGNATURE_TTL_MS = 60_000;

/**
 * Кешувати надовго не можна: посилання протермінується, і повторне
 * відкриття діалогу дало б мертвий URL. Тому час життя в кеші свідомо
 * коротший за час життя підпису.
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
