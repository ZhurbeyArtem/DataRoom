import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useDataRooms } from '@/features/data-rooms/hooks/use-data-rooms';
import { FolderView } from '@/features/items/components/folder-view';
import { ShareDialog } from '@/features/shares/components/share-dialog';
import type { ShareTarget } from '@/types/share-target';

export const Route = createFileRoute('/_authed/rooms/$roomId/$itemId')({
  component: FolderPage,
});

function FolderPage() {
  const { roomId, itemId } = Route.useParams();
  const rooms = useDataRooms();
  const room = rooms.data?.find((candidate) => candidate.id === roomId);

  // The room is in your own list, therefore you own it. If it is not, you
  // arrived here through a named grant: no actions, read only. Without this
  // a grantee would see "New folder" and "Upload" buttons that the server
  // would reject anyway.
  const isOwner = rooms.isSuccess && room !== undefined;
  const [sharing, setSharing] = useState<ShareTarget | null>(null);

  return (
    <>
      <FolderView
        roomId={roomId}
        roomName={room?.name}
        rootItemId={room?.rootItemId ?? null}
        readOnly={!isOwner}
        itemId={itemId}
        onShare={isOwner ? setSharing : undefined}
      />
      <ShareDialog target={sharing} onOpenChange={() => setSharing(null)} />
    </>
  );
}
