import { useQuery } from '@tanstack/react-query';
import { AccessDeniedScreen } from '@/components/access-denied-screen';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderView } from '@/features/items/components/folder-view';
import { sharesApi } from '@/features/shares/api/shares';

/**
 * Живе в шарі застосунку, а не у фічі: складає докупи фічу елементів
 * (оглядач папки) і фічу доступів (розвʼязання токена), а прямий імпорт
 * між фічами заборонений.
 */
export function PublicFolder({ token, itemId }: { token: string; itemId?: string }) {
  // Глядач має лише токен, тому спершу зʼясовуємо, ЩО йому відкрито.
  const target = useQuery({
    queryKey: ['share-target', token],
    queryFn: sharesApi.target,
    retry: false,
  });

  if (target.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (target.isError || !target.data) return <AccessDeniedScreen />;

  const shared = target.data.item;

  return (
    <FolderView
      roomId={target.data.dataRoomId}
      roomName={shared.name}
      rootItemId={shared.id}
      // Корінь для глядача — це елемент, яким поділилися, а не корінь
      // кімнати: до нього доступу немає й бути не має.
      itemId={itemId ?? shared.id}
      readOnly
      shareToken={token}
    />
  );
}
