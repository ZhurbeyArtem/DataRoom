import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { FolderPlus, Share2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessDeniedScreen } from '@/components/access-denied-screen';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { ApiError } from '@/lib/api-client';
import { useDocumentTitle } from '@/hooks/use-document-title';
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
  /** Omitted — the visitor does not own the room and does not know its name. */
  roomName?: string;
  /** The room's root folder — the parent every new item is created under. */
  rootItemId: string | null;
  /** Omitted — show the room root. */
  itemId?: string;
  /**
   * Public viewer mode: no actions, no upload, no drop zone. They are not
   * hidden with styles — they are simply absent from the tree.
   */
  readOnly?: boolean;
  /** Omitted — the share buttons and the "Share" entry are not rendered. */
  onShare?: (target: ShareTarget) => void;
  /** Set — navigation goes through the public link routes. */
  shareToken?: string;
}

/**
 * One container serves three cases: a room root, a nested folder, and the
 * public view behind a link. The only differences are what bounds the
 * listing and which actions are allowed.
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

  // The root listing was requested by room, so that is the key it sits under
  // in the cache; for a nested folder the key is its own id.
  const scopeId = itemId ?? roomId;
  const parentId = itemId ?? rootItemId;
  const canEdit = !readOnly && parentId !== null;

  const client = useQueryClient();
  const setOnUploaded = useUploadStore((state) => state.setOnUploaded);

  // The upload queue lives outside the React tree, so refreshing the listing
  // after each confirmed file is hooked up here: files appear in the table
  // one by one rather than all at the end.
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

  // At the room root the folder name and the room name are the same, so use
  // whichever is already known — otherwise the title would flicker twice.
  useDocumentTitle(itemId ? current.data?.item.name : roomName);

  const items = listing.data?.items ?? [];
  const isEmpty = listing.isSuccess && items.length === 0;

  // A 404 means both "deleted" and "access revoked" — which is exactly why
  // there is one screen. Thanks to the refetch on window focus it appears by
  // itself the moment an owner revokes access on an open viewer tab.
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
          // When standing at the root of the visible branch, its name is
          // already the first crumb — otherwise it would appear twice in a
          // row.
          current={
            itemId && itemId !== rootItemId ? current.data?.item.name : undefined
          }
          readOnly={readOnly}
          shareToken={shareToken}
        />

        {/* Wraps: at 375 px three buttons do not fit on one line, and
            without wrapping the page would scroll sideways. */}
        <div className="flex flex-wrap items-center gap-2">
          {onShare && rootItemId && !itemId && (
            <Button
              variant="outline"
              onClick={() =>
                onShare({ id: rootItemId, name: roomName ?? 'Data room', kind: 'room' })
              }
            >
              <Share2 className="size-4" />
              Share
            </Button>
          )}
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setCreating(true)}>
                <FolderPlus className="size-4" />
                New folder
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

      {/* The drop zone covers both the table and the empty state: an empty
          folder is where files get dropped most often. */}
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
 * While the room is still loading, or in read-only mode, there is no real
 * parent folder — then the contents are shown without a drop zone.
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
      <h2 className="font-medium">Could not load the contents</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
