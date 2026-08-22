import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useDataRooms } from '@/features/data-rooms/hooks/use-data-rooms';
import { FolderView } from '@/features/items/components/folder-view';
import { ShareDialog } from '@/features/shares/components/share-dialog';
import type { ShareTarget } from '@/types/share-target';

export const Route = createFileRoute('/_authed/rooms/$roomId/')({
  component: RoomRootPage,
});

/**
 * Маршрут складає докупи дві фічі — оглядач елементів і діалог доступів.
 * Композиція живе тут саме тому, що фічі не імпортують одна одну.
 */
function RoomRootPage() {
  const { roomId } = Route.useParams();
  const rooms = useDataRooms();
  const room = rooms.data?.find((candidate) => candidate.id === roomId);

  // Кімната є у власному списку — отже, ти власник. Якщо ні, ти потрапив сюди
  // за іменним доступом: жодних дій, лише читання. Без цього отримувач гранту
  // бачив би кнопки «Нова папка» й «Завантажити», які сервер усе одно відхилив би.
  const isOwner = rooms.isSuccess && room !== undefined;
  const [sharing, setSharing] = useState<ShareTarget | null>(null);

  return (
    <>
      <FolderView
        roomId={roomId}
        roomName={room?.name}
        rootItemId={room?.rootItemId ?? null}
        readOnly={!isOwner}
        onShare={isOwner ? setSharing : undefined}
      />
      <ShareDialog target={sharing} onOpenChange={() => setSharing(null)} />
    </>
  );
}
