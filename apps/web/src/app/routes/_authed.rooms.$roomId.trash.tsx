import { createFileRoute } from '@tanstack/react-router';
import { useDataRooms } from '@/features/data-rooms/hooks/use-data-rooms';
import { TrashView } from '@/features/items/trash/components/trash-view';

export const Route = createFileRoute('/_authed/rooms/$roomId/trash')({
  component: TrashPage,
});

function TrashPage() {
  const { roomId } = Route.useParams();
  const rooms = useDataRooms();
  const room = rooms.data?.find((candidate) => candidate.id === roomId);

  return <TrashView roomId={roomId} roomName={room?.name} />;
}
