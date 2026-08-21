import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

/**
 * Носить requestId і userId наскрізь через увесь ланцюжок викликів,
 * щоб їх не доводилось протягувати параметром через кожен сервіс.
 */
export const RequestContext = {
  run<T>(store: RequestStore, callback: () => T): T {
    return storage.run(store, callback);
  },

  get(): RequestStore | undefined {
    return storage.getStore();
  },

  setUserId(userId: string): void {
    const store = storage.getStore();
    if (store) store.userId = userId;
  },
};
