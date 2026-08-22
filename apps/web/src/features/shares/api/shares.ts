import { api } from '@/lib/api-client';
import type {
  CreateShareInput,
  Share,
  SharedWithMeEntry,
  ShareTargetResponse,
} from '@/types/api';

export const sharesApi = {
  /** Що саме відкрито за цим посиланням — єдиний запит, доступний лише за токеном. */
  target: () => api.get<ShareTargetResponse>('/shares/target'),

  listForItem: (itemId: string) => api.get<Share[]>(`/items/${itemId}/shares`),

  create: (itemId: string, body: CreateShareInput) =>
    api.post<Share>(`/items/${itemId}/shares`, body),

  revoke: (shareId: string) => api.delete<void>(`/shares/${shareId}`),

  withMe: () => api.get<SharedWithMeEntry[]>('/shares/with-me'),
};
