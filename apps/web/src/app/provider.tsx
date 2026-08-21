import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '@/lib/react-query';

/**
 * QueryClient створюється в стані, а не в модулі: інакше при hot reload
 * зберігався б кеш від попередньої версії коду.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
