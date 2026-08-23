import { api } from '@/lib/api-client';
import type {
  Breadcrumb,
  Item,
  Paginated,
  SearchResultItem,
  SubtreeStats,
  UploadTicket,
} from '@/types/api';
import type { CreateFolderInput, CreateUploadUrlInput } from '@/types/api';

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

export const itemsApi = {
  list: (params: { parentId?: string; dataRoomId?: string; cursor?: string; limit?: number }) =>
    api.get<Paginated<Item>>(`/items?${query(params)}`),

  get: (id: string) => api.get<{ item: Item; breadcrumbs: Breadcrumb[] }>(`/items/${id}`),

  stats: (id: string) => api.get<SubtreeStats>(`/items/${id}/stats`),

  search: (params: { dataRoomId: string; q: string; cursor?: string; limit?: number }) =>
    api.get<Paginated<SearchResultItem>>(`/items/search?${query(params)}`),

  createFolder: (body: CreateFolderInput) =>
    api.post<Item>('/items/folders', body),

  rename: (id: string, name: string) => api.patch<Item>(`/items/${id}`, { name }),

  move: (id: string, targetParentId: string) =>
    api.post<Item>(`/items/${id}/move`, { targetParentId }),

  remove: (id: string) => api.delete<void>(`/items/${id}`),

  restore: (id: string) => api.post<Item>(`/items/${id}/restore`),

  trash: (dataRoomId: string) => api.get<Item[]>(`/items/trash/${dataRoomId}`),

  // Three-step upload: URL → PUT straight to storage → confirmation.
  createUploadUrl: (body: CreateUploadUrlInput) =>
    api.post<UploadTicket>('/items/upload-url', body),

  confirmUpload: (id: string) => api.post<Item>(`/items/${id}/confirm`),

  downloadUrl: (id: string) => api.get<{ url: string }>(`/items/${id}/download-url`),
};
