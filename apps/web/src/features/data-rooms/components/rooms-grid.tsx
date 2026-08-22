import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/utils/error-message';
import type { DataRoom } from '@/types/api';
import { useDataRooms } from '../hooks/use-data-rooms';
import { RoomCard } from './room-card';
import { CreateRoomDialog, DeleteRoomDialog, RenameRoomDialog } from './room-dialogs';

export function RoomsGrid() {
  const rooms = useDataRooms();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<DataRoom | null>(null);
  const [deleting, setDeleting] = useState<DataRoom | null>(null);

  useDocumentTitle('Кімнати');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Кімнати</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Кожна кімната — окреме сховище документів із власним доступом
          </p>
        </div>

        <Button onClick={() => setCreating(true)}>
          <FolderPlus className="size-4" />
          Створити кімнату
        </Button>
      </div>

      {rooms.isPending && <GridSkeleton />}

      {rooms.isError && (
        <ErrorState message={errorMessage(rooms.error)} onRetry={() => void rooms.refetch()} />
      )}

      {rooms.isSuccess && rooms.data.length === 0 && (
        <EmptyState onCreate={() => setCreating(true)} />
      )}

      {rooms.isSuccess && rooms.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.data.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onRename={setRenaming}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <CreateRoomDialog open={creating} onOpenChange={setCreating} />
      <RenameRoomDialog room={renaming} onOpenChange={() => setRenaming(null)} />
      <DeleteRoomDialog room={deleting} onOpenChange={() => setDeleting(null)} />
    </div>
  );
}

/** Скелетон повторює форму майбутнього вмісту, а не крутиться по центру. */
function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-xl border p-4">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="mt-3 h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Порожній стан із дією: користувач одразу бачить, що робити далі. */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed py-16 text-center">
      <h2 className="text-lg font-medium">Ще немає жодної кімнати</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Створіть першу, щоб почати збирати документи для due diligence
      </p>
      <Button className="mt-5" onClick={onCreate}>
        <FolderPlus className="size-4" />
        Створити кімнату
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
      <h2 className="font-medium">Не вдалося завантажити кімнати</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        Спробувати ще
      </Button>
    </div>
  );
}
