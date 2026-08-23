import { Link } from '@tanstack/react-router';
import { FileText, Folder, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatRelative } from '@/utils/format';
import { useSharedWithMe } from '../hooks/use-shares';

/**
 * Named grants only: public links are not addressed to anyone in
 * particular, so they have no place in "shared with me".
 */
export function SharedWithMeList() {
  const shared = useSharedWithMe();

  useDocumentTitle('Shared with me');

  return (
    <div>
      <h1 className="text-2xl font-medium">Shared with me</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Documents you were given access to by email
      </p>

      <div className="mt-6">
        {shared.isPending && (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {shared.isSuccess && shared.data.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-6 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-medium">Nothing here yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Anything shared with your email address will show up here
            </p>
          </div>
        )}

        {shared.isSuccess && shared.data.length > 0 && (
          <ul className="divide-y rounded-xl border">
            {shared.data.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={
                    entry.item.type === 'FOLDER'
                      ? paths.folder(entry.item.dataRoomId, entry.item.id)
                      : paths.folder(entry.item.dataRoomId, entry.item.parentId ?? entry.item.id)
                  }
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  {entry.item.type === 'FOLDER' ? (
                    <Folder className="size-4.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="size-4.5 shrink-0 text-muted-foreground" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{entry.item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Shared {formatRelative(entry.createdAt)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
