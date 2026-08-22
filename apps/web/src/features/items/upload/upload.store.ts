import { create } from 'zustand';
import { errorMessage } from '@/utils/error-message';
import { itemsApi } from '../api/items';
import { putWithProgress } from './put-with-progress';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

export interface UploadTask {
  id: string;
  fileName: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  parentId: string;
  scopeId: string;
  file: File;
  controller: AbortController;
}

/**
 * Три одночасні аплоади: більше не пришвидшує, бо канал усе одно спільний,
 * але помітно збільшує шанс, що частина впаде за таймаутом.
 */
const MAX_PARALLEL = 3;

interface UploadState {
  tasks: UploadTask[];
  /** Викликається після кожного підтвердженого файлу — щоб лістинг оновився. */
  onUploaded?: (scopeId: string) => void;
  setOnUploaded: (handler: (scopeId: string) => void) => void;
  enqueue: (files: File[], target: { parentId: string; scopeId: string }) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  clearFinished: () => void;
}

export const useUploadStore = create<UploadState>((set, get) => {
  function patch(id: string, changes: Partial<UploadTask>): void {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    }));
  }

  async function run(task: UploadTask): Promise<void> {
    patch(task.id, { status: 'uploading' });

    try {
      // Крок 1: сервер створює рядок у статусі PENDING і видає підписаний URL.
      const ticket = await itemsApi.createUploadUrl({
        parentId: task.parentId,
        fileName: task.fileName,
        mimeType: task.file.type || 'application/pdf',
        size: task.size,
      });

      // Крок 2: байти йдуть напряму у сховище, повз наш API.
      await putWithProgress(
        ticket.uploadUrl,
        task.file,
        (fraction) => patch(task.id, { progress: fraction }),
        task.controller.signal,
      );

      // Крок 3: сервер звіряє розмір із реальним обʼєктом і робить файл видимим.
      await itemsApi.confirmUpload(ticket.itemId);

      patch(task.id, { status: 'done', progress: 1 });
      get().onUploaded?.(task.scopeId);
    } catch (error) {
      patch(task.id, {
        status: task.controller.signal.aborted ? 'canceled' : 'error',
        error: task.controller.signal.aborted ? undefined : errorMessage(error),
      });
    } finally {
      pump();
    }
  }

  /** Тримає рівно MAX_PARALLEL активних аплоадів, підбираючи наступні з черги. */
  function pump(): void {
    const active = get().tasks.filter((task) => task.status === 'uploading').length;
    const free = MAX_PARALLEL - active;
    if (free <= 0) return;

    for (const task of get().tasks.filter((t) => t.status === 'queued').slice(0, free)) {
      void run(task);
    }
  }

  return {
    tasks: [],

    setOnUploaded: (onUploaded) => set({ onUploaded }),

    enqueue: (files, target) => {
      const tasks: UploadTask[] = files.map((file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        size: file.size,
        progress: 0,
        status: 'queued',
        parentId: target.parentId,
        scopeId: target.scopeId,
        file,
        controller: new AbortController(),
      }));

      set((state) => ({ tasks: [...state.tasks, ...tasks] }));
      pump();
    },

    cancel: (id) => {
      get().tasks.find((task) => task.id === id)?.controller.abort();
      patch(id, { status: 'canceled' });
    },

    retry: (id) => {
      // Новий AbortController: старий уже спрацював і скасував би повтор одразу.
      patch(id, {
        status: 'queued',
        progress: 0,
        error: undefined,
        controller: new AbortController(),
      });
      pump();
    },

    clearFinished: () =>
      set((state) => ({
        tasks: state.tasks.filter(
          (task) => task.status !== 'done' && task.status !== 'canceled',
        ),
      })),
  };
});
