import { createFileRoute } from '@tanstack/react-router';
import { useDataRooms } from '@/features/data-rooms/hooks/use-data-rooms';

export const Route = createFileRoute('/_authed/rooms/$roomId')({ component: RoomPage });

function RoomPage() {
  const { roomId } = Route.useParams();
  const rooms = useDataRooms();
  const room = rooms.data?.find((candidate) => candidate.id === roomId);

  return (
    <div>
      <h1 className="text-2xl font-medium">{room?.name ?? 'Кімната'}</h1>
      <p className="mt-2 text-muted-foreground">
        Оглядач папок зʼявиться в наступній задачі.
      </p>
    </div>
  );
}
