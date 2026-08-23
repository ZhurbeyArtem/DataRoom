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
 * The route composes two features — the item browser and the share dialog.
 * The composition lives here precisely because features never import each
 * other.
 */
function RoomRootPage() {
  const { roomId } = Route.useParams();
  const rooms = useDataRooms();
  const room = rooms.data?.find((candidate) => candidate.id === roomId);
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [query, setQuery] = useState('');

  // The room is in your own list, therefore you own it. If it is not, you
  // arrived here through a named grant: no actions, read only. Without this
  // a grantee would see "New folder" and "Upload" buttons that the server
  // would reject anyway.
  const isOwner = rooms.isSuccess && room !== undefined;
  const searching = query.trim().length > 0;

  // While searching there is no folder view in the tree — nobody sets the
  // tab title, and it would fall back to the generic "Data Room".
  useDocumentTitle(searching && room ? `Search · ${room.name}` : undefined);

  return (
    <>
      {/* Search and trash are owner-only: both work across the whole room,
          while a viewer must see exactly what was shared with them. */}
      {isOwner && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SearchInput value={query} onChange={setQuery} />

          {/* A link styled as a button rather than the Button component:
              that would keep <button> semantics and a screen reader would
              announce the link as a button. */}
          <Link
            to={paths.trash(roomId)}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <Trash2 className="size-4" />
            Trash
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
