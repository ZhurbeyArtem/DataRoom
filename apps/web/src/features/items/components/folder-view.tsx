import { useNavigate } from '@tanstack/react-router';
import { FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { errorMessage } from '@/utils/error-message';
import type { Item } from '@/types/api';
import { useItem, useItemsList } from '../hooks/use-items';
import { ItemActionsMenu } from './item-actions-menu';
import { ItemBreadcrumbs } from './item-breadcrumbs';
import {
  CreateFolderDialog,
  DeleteItemDialog,
  MoveItemDialog,
  RenameItemDialog,
} from './item-dialogs';
import { ItemsEmptyState } from './items-empty-state';
import { ItemsTable } from './items-table';

interface FolderViewProps {
  roomId: string;
  roomName: string;
  /** Коренева папка кімнати — саме вона стає батьком для нових елементів. */
  rootItemId: string | null;
  /** Не задано — показуємо корінь кімнати. */
  itemId?: string;
}

/**
 * Один контейнер обслуговує і корінь кімнати, і будь-яку вкладену папку:
 * різниця лише в тому, чим обмежений лістинг і чи є ланцюжок предків.
 */
export function FolderView({ roomId, roomName, rootItemId, itemId }: FolderViewProps) {
  const navigate = useNavigate();
  const current = useItem(itemId);
  const listing = useItemsList(itemId ? { parentId: itemId } : { dataRoomId: roomId });

  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Item | null>(null);
  const [moving, setMoving] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  // Лістинг кореня запитувався по кімнаті, тому під цим ключем він і лежить
  // у кеші; для вкладеної папки ключ — її власний id.
  const scopeId = itemId ?? roomId;
  const parentId = itemId ?? rootItemId;

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ItemBreadcrumbs
          roomId={roomId}
          roomName={roomName}
          trail={current.data?.breadcrumbs ?? []}
          current={itemId ? current.data?.item.name : undefined}
        />

        <Button
          variant="outline"
          disabled={parentId === null}
          onClick={() => setCreating(true)}
        >
          <FolderPlus className="size-4" />
          Нова папка
        </Button>
      </div>

      {listing.isError && (
        <ErrorState
          message={errorMessage(listing.error)}
          onRetry={() => void listing.refetch()}
        />
      )}

      {isEmpty && (
        <ItemsEmptyState
          variant={itemId ? 'empty-folder' : 'empty-room'}
          action={
            <Button disabled={parentId === null} onClick={() => setCreating(true)}>
              <FolderPlus className="size-4" />
              Створити папку
            </Button>
          }
        />
      )}

      {!listing.isError && !isEmpty && (
        <ItemsTable
          items={items}
          isLoading={listing.isPending}
          hasNextPage={listing.hasNextPage}
          isFetchingNextPage={listing.isFetchingNextPage}
          onLoadMore={() => void listing.fetchNextPage()}
          onOpen={open}
          renderRowActions={(item) => (
            <ItemActionsMenu
              item={item}
              onRename={setRenaming}
              onMove={setMoving}
              onDelete={setDeleting}
            />
          )}
        />
      )}

      {parentId && (
        <CreateFolderDialog
          open={creating}
          onOpenChange={setCreating}
          scope={{ scopeId, parentId }}
        />
      )}
      <RenameItemDialog
        item={renaming}
        onOpenChange={() => setRenaming(null)}
        scopeId={scopeId}
      />
      <MoveItemDialog
        item={moving}
        onOpenChange={() => setMoving(null)}
        roomId={roomId}
        scopeId={scopeId}
      />
      <DeleteItemDialog
        item={deleting}
        onOpenChange={() => setDeleting(null)}
        scopeId={scopeId}
      />
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
