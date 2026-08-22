import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { FolderPlus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { errorMessage } from '@/utils/error-message';
import type { Item } from '@/types/api';
import { itemsKey, useItem, useItemsList } from '../hooks/use-items';
import { FolderDropZone, UploadButton } from '../upload/components/folder-drop-zone';
import { useUploadStore } from '../upload/upload.store';
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

  const client = useQueryClient();
  const setOnUploaded = useUploadStore((state) => state.setOnUploaded);

  // Черга аплоаду живе поза React-деревом, тому оновлення лістингу після
  // кожного підтвердженого файлу вішається сюди: файли зʼявляються в таблиці
  // по одному, а не всі наприкінці.
  useEffect(() => {
    setOnUploaded((finishedScopeId) => {
      void client.invalidateQueries({ queryKey: itemsKey(finishedScopeId) });
    });
  }, [client, setOnUploaded]);

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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={parentId === null}
            onClick={() => setCreating(true)}
          >
            <FolderPlus className="size-4" />
            Нова папка
          </Button>
          {parentId && <UploadButton parentId={parentId} scopeId={scopeId} />}
        </div>
      </div>

      {listing.isError && (
        <ErrorState
          message={errorMessage(listing.error)}
          onRetry={() => void listing.refetch()}
        />
      )}

      {/* Зона перетягування накриває і таблицю, і порожній стан: у порожню
          папку файли кидають найчастіше. */}
      {!listing.isError && (
        <MaybeDropZone parentId={parentId} scopeId={scopeId}>
          {isEmpty ? (
            <ItemsEmptyState
              variant={itemId ? 'empty-folder' : 'empty-room'}
              action={
                parentId ? (
                  <UploadButton parentId={parentId} scopeId={scopeId} />
                ) : undefined
              }
            />
          ) : (
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
        </MaybeDropZone>
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

/**
 * Поки кімната ще не завантажилась, реальної папки-батька немає — тоді
 * вміст показуємо без зони перетягування, а не ховаємо його зовсім.
 */
function MaybeDropZone({
  parentId,
  scopeId,
  children,
}: {
  parentId: string | null;
  scopeId: string;
  children: ReactNode;
}) {
  if (!parentId) return <>{children}</>;

  return (
    <FolderDropZone parentId={parentId} scopeId={scopeId}>
      {children}
    </FolderDropZone>
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
