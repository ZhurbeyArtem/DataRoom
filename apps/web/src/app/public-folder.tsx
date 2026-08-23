import { useQuery } from '@tanstack/react-query';
import { AccessDeniedScreen } from '@/components/access-denied-screen';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderView } from '@/features/items/components/folder-view';
import { sharesApi } from '@/features/shares/api/shares';

/**
 * Lives in the app layer rather than in a feature: it composes the items
 * feature (the folder view) with the shares feature (resolving the token),
 * and direct imports between features are forbidden.
 */
export function PublicFolder({ token, itemId }: { token: string; itemId?: string }) {
  // A visitor holds only the token, so first find out WHAT was opened.
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
      // For a visitor the root is the shared item, not the room root: they
      // have no access to that one, and should not have.
      itemId={itemId ?? shared.id}
      readOnly
      shareToken={token}
    />
  );
}
