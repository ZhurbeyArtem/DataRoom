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
 * Three uploads at a time: more does not go faster, since the connection is
 * shared anyway, but it noticeably raises the chance that some of them time
 * out.
 */
const MAX_PARALLEL = 3;

interface UploadState {
  tasks: UploadTask[];
  /** Called after each confirmed file so the listing refreshes. */
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
      // Step 1: the server creates a PENDING row and issues a signed URL.
      const ticket = await itemsApi.createUploadUrl({
        parentId: task.parentId,
        fileName: task.fileName,
        mimeType: task.file.type || 'application/pdf',
        size: task.size,
      });

      // Step 2: the bytes go straight to storage, bypassing our API.
      await putWithProgress(
        ticket.uploadUrl,
        task.file,
        (fraction) => patch(task.id, { progress: fraction }),
        task.controller.signal,
      );

      // Step 3: the server verifies the object and makes the file visible.
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

  /** Keeps exactly MAX_PARALLEL uploads running, pulling the next from the queue. */
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
      // A fresh AbortController: the old one already fired and would abort
      // the retry immediately.
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
