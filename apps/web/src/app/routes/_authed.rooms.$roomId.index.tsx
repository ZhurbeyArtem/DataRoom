import { Link, createFileRoute } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useDataRooms } from '@/features/data-rooms/hooks/use-data-rooms';
import { FolderView } from '@/features/items/components/folder-view';
import { SearchInput } from '@/features/items/search/components/search-input';
import { SearchResults } from '@/features/items/search/components/search-results';
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
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [query, setQuery] = useState('');

  // Кімната є у власному списку — отже, ти власник. Якщо ні, ти потрапив сюди
  // за іменним доступом: жодних дій, лише читання. Без цього отримувач гранту
  // бачив би кнопки «Нова папка» й «Завантажити», які сервер усе одно відхилив би.
  const isOwner = rooms.isSuccess && room !== undefined;
  const searching = query.trim().length > 0;

  // Поки шукаємо, оглядача папки в дереві немає — заголовок вкладки нікому
  // ставити, і він падав би до типового «Data Room».
  useDocumentTitle(searching && room ? `Пошук · ${room.name}` : undefined);

  return (
    <>
      {/* Пошук і кошик доступні лише власнику: обидва працюють по всій
          кімнаті, а глядач має бачити рівно те, чим із ним поділилися. */}
      {isOwner && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={query} onChange={setQuery} />

          {/* Посилання зі стилями кнопки, а не компонент Button: він лишив би
              семантику <button>, і читалка оголосила б посилання кнопкою. */}
          <Link
            to={paths.trash(roomId)}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <Trash2 className="size-4" />
            Кошик
          </Link>
        </div>
      )}

      {searching ? (
        <SearchResults roomId={roomId} query={query} onClear={() => setQuery('')} />
      ) : (
        <FolderView
          roomId={roomId}
          roomName={room?.name}
          rootItemId={room?.rootItemId ?? null}
          readOnly={!isOwner}
          onShare={isOwner ? setSharing : undefined}
        />
      )}

      <ShareDialog target={sharing} onOpenChange={() => setSharing(null)} />
    </>
  );
}
