import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

/**
 * Carries requestId and userId through the whole call chain so they don't
 * have to be threaded as a parameter through every service.
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
