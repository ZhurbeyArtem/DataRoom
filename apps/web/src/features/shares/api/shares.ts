import { api } from '@/lib/api-client';
import type { CreateShareInput, Share, SharedWithMeEntry } from '@/types/api';

export const sharesApi = {
  listForItem: (itemId: string) => api.get<Share[]>(`/items/${itemId}/shares`),

  create: (itemId: string, body: CreateShareInput) =>
    api.post<Share>(`/items/${itemId}/shares`, body),

  revoke: (shareId: string) => api.delete<void>(`/shares/${shareId}`),

  withMe: () => api.get<SharedWithMeEntry[]>('/shares/with-me'),
};
