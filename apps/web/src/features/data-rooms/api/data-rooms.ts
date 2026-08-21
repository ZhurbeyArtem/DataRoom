import { api } from '@/lib/api-client';
import type { DataRoom } from '@/types/api';

export const dataRoomsApi = {
  list: () => api.get<DataRoom[]>('/data-rooms'),
  get: (id: string) => api.get<DataRoom>(`/data-rooms/${id}`),
  create: (name: string) => api.post<DataRoom>('/data-rooms', { name }),
  rename: (id: string, name: string) => api.patch<DataRoom>(`/data-rooms/${id}`, { name }),
  remove: (id: string) => api.delete<void>(`/data-rooms/${id}`),
};
