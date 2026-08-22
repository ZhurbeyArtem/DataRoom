import { createFileRoute } from '@tanstack/react-router';
import { useDataRooms } from '@/features/data-rooms/hooks/use-data-rooms';
import { FolderView } from '@/features/items/components/folder-view';

export const Route = createFileRoute('/_authed/rooms/$roomId/')({
  component: RoomRootPage,
});

function RoomRootPage() {
  const { roomId } = Route.useParams();
  const rooms = useDataRooms();
  const room = rooms.data?.find((candidate) => candidate.id === roomId);

  return (
    <FolderView
      roomId={roomId}
      roomName={room?.name ?? 'Кімната'}
      rootItemId={room?.rootItemId ?? null}
    />
  );
}
