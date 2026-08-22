import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { errorMessage } from '@/utils/error-message';
import type { Item } from '@/types/api';
import { useItem, useItemsList } from '../hooks/use-items';
import { ItemBreadcrumbs } from './item-breadcrumbs';
import { ItemsEmptyState } from './items-empty-state';
import { ItemsTable } from './items-table';

interface FolderViewProps {
  roomId: string;
  roomName: string;
  /** Не задано — показуємо корінь кімнати. */
  itemId?: string;
}

/**
 * Один контейнер обслуговує і корінь кімнати, і будь-яку вкладену папку:
 * різниця лише в тому, чим обмежений лістинг і чи є ланцюжок предків.
 */
export function FolderView({ roomId, roomName, itemId }: FolderViewProps) {
  const navigate = useNavigate();
  const current = useItem(itemId);
  const listing = useItemsList(
    itemId ? { parentId: itemId } : { dataRoomId: roomId },
  );

  function open(item: Item) {
    if (item.type === 'FOLDER') {
      void navigate({ to: paths.folder(roomId, item.id) });
    }
    // Файли відкриватиме переглядач PDF — Задача 17.
  }

  const items = listing.data?.items ?? [];
  const isEmpty = listing.isSuccess && items.length === 0;

  return (
    <div className="space-y-4">
      <ItemBreadcrumbs
        roomId={roomId}
        roomName={roomName}
        trail={current.data?.breadcrumbs ?? []}
        current={itemId ? current.data?.item.name : undefined}
      />

      {listing.isError && (
        <ErrorState
          message={errorMessage(listing.error)}
          onRetry={() => void listing.refetch()}
        />
      )}

      {isEmpty && <ItemsEmptyState variant={itemId ? 'empty-folder' : 'empty-room'} />}

      {!listing.isError && !isEmpty && (
        <ItemsTable
          items={items}
          isLoading={listing.isPending}
          hasNextPage={listing.hasNextPage}
          isFetchingNextPage={listing.isFetchingNextPage}
          onLoadMore={() => void listing.fetchNextPage()}
          onOpen={open}
        />
      )}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
      <h2 className="font-medium">Не вдалося завантажити вміст</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        Спробувати ще
      </Button>
    </div>
  );
}
