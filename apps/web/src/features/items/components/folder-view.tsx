import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { FolderPlus, Share2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessDeniedScreen } from '@/components/access-denied-screen';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { ApiError } from '@/lib/api-client';
import { errorMessage } from '@/utils/error-message';
import type { Item } from '@/types/api';
import type { ShareTarget } from '@/types/share-target';
import { itemsKey, useItem, useItemsList } from '../hooks/use-items';
import { FolderDropZone, UploadButton } from '../upload/components/folder-drop-zone';
import { useUploadStore } from '../upload/upload.store';
import { PdfViewerDialog } from '../viewer/components/pdf-viewer-dialog';
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
  /** Не задано — відвідувач не власник кімнати, і її назви він не знає. */
  roomName?: string;
  /** Коренева папка кімнати — саме вона стає батьком для нових елементів. */
  rootItemId: string | null;
  /** Не задано — показуємо корінь кімнати. */
  itemId?: string;
  /**
   * Режим публічного глядача: жодних дій, аплоаду й зони перетягування.
   * Не приховані стилями — їх просто немає в дереві.
   */
  readOnly?: boolean;
  /** Не задано — кнопки й пункт «Поділитися» не рендеряться. */
  onShare?: (target: ShareTarget) => void;
  /** Задано — навігація йде публічними маршрутами за посиланням. */
  shareToken?: string;
}

/**
 * Один контейнер обслуговує три випадки: корінь кімнати, вкладену папку
 * і публічний перегляд за посиланням. Різниця лише в тому, чим обмежений
 * лістинг і які дії дозволені.
 */
export function FolderView({
  roomId,
  roomName,
  rootItemId,
  itemId,
  readOnly = false,
  onShare,
  shareToken,
}: FolderViewProps) {
  const navigate = useNavigate();
  const current = useItem(itemId);
  const listing = useItemsList(itemId ? { parentId: itemId } : { dataRoomId: roomId });

  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Item | null>(null);
  const [moving, setMoving] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [previewing, setPreviewing] = useState<Item | null>(null);

  // Лістинг кореня запитувався по кімнаті, тому під цим ключем він і лежить
  // у кеші; для вкладеної папки ключ — її власний id.
  const scopeId = itemId ?? roomId;
  const parentId = itemId ?? rootItemId;
  const canEdit = !readOnly && parentId !== null;

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
      void navigate({
        to: shareToken
          ? paths.publicFolder(shareToken, item.id)
          : paths.folder(roomId, item.id),
      });
      return;
    }
    setPreviewing(item);
  }

  const items = listing.data?.items ?? [];
  const isEmpty = listing.isSuccess && items.length === 0;

  // 404 означає і «видалено», і «доступ відкликано» — саме тому екран один.
  // Завдяки рефетчу при поверненні фокуса він зʼявляється сам, щойно
  // власник забирає доступ у відкритої вкладки глядача.
  const denied =
    (listing.error instanceof ApiError && listing.error.isNotFound) ||
    (current.error instanceof ApiError && current.error.isNotFound);

  if (denied) return <AccessDeniedScreen />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ItemBreadcrumbs
          roomId={roomId}
          roomName={roomName}
          trail={current.data?.breadcrumbs ?? []}
          // Коли ми стоїмо в корені видимої гілки, його назва вже є першою
          // крихтою — інакше вона зʼявилася б у ланцюжку двічі поспіль.
          current={
            itemId && itemId !== rootItemId ? current.data?.item.name : undefined
          }
          readOnly={readOnly}
          shareToken={shareToken}
        />

        <div className="flex items-center gap-2">
          {onShare && rootItemId && !itemId && (
            <Button
              variant="outline"
              onClick={() =>
                onShare({ id: rootItemId, name: roomName ?? 'Кімната', kind: 'room' })
              }
            >
              <Share2 className="size-4" />
              Поділитися
            </Button>
          )}
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setCreating(true)}>
                <FolderPlus className="size-4" />
                Нова папка
              </Button>
              <UploadButton parentId={parentId} scopeId={scopeId} />
            </>
          )}
        </div>
      </div>

      {listing.isError && !denied && (
        <ErrorState
          message={errorMessage(listing.error)}
          onRetry={() => void listing.refetch()}
        />
      )}

      {/* Зона перетягування накриває і таблицю, і порожній стан: у порожню
          папку файли кидають найчастіше. */}
      {!listing.isError && (
        <MaybeDropZone parentId={canEdit ? parentId : null} scopeId={scopeId}>
          {isEmpty ? (
            <ItemsEmptyState
              variant={itemId ? 'empty-folder' : 'empty-room'}
              readOnly={readOnly}
              action={
                canEdit ? <UploadButton parentId={parentId} scopeId={scopeId} /> : undefined
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
              renderRowActions={
                readOnly
                  ? undefined
                  : (item) => (
                      <ItemActionsMenu
                        item={item}
                        onRename={setRenaming}
                        onMove={setMoving}
                        onDelete={setDeleting}
                        onShare={
                          onShare &&
                          ((target) =>
                            onShare({
                              id: target.id,
                              name: target.name,
                              kind: target.type === 'FOLDER' ? 'folder' : 'file',
                            }))
                        }
                      />
                    )
              }
            />
          )}
        </MaybeDropZone>
      )}

      {canEdit && (
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
      <PdfViewerDialog item={previewing} onOpenChange={() => setPreviewing(null)} />
    </div>
  );
}

/**
 * Поки кімната ще не завантажилась або ми в режимі читання, реальної
 * папки-батька немає — тоді вміст показуємо без зони перетягування.
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
