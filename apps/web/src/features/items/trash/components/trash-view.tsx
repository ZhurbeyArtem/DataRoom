import { Link } from '@tanstack/react-router';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage } from '@/utils/error-message';
import { formatBytes, formatRelative } from '@/utils/format';
import { ItemIcon } from '../../components/item-icon';
import { useRestoreItem, useTrash } from '../use-trash';

export function TrashView({ roomId, roomName }: { roomId: string; roomName?: string }) {
  const trash = useTrash(roomId);
  const restore = useRestoreItem(roomId);

  useDocumentTitle(roomName && `Trash · ${roomName}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={paths.room(roomId)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {roomName ?? 'Back to the room'}
          </Link>
          <h1 className="mt-1 text-2xl font-medium">Trash</h1>
        </div>
      </div>

      {trash.isPending && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {trash.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
          <h2 className="font-medium">Could not load the trash</h2>
          <p className="mt-1 text-sm text-muted-foreground">{errorMessage(trash.error)}</p>
        </div>
      )}

      {trash.isSuccess && trash.data.length === 0 && (
        <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Trash2 className="size-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-medium">The trash is empty</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Deleted folders and files stay here until you restore them
          </p>
        </div>
      )}

      {trash.isSuccess && trash.data.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {trash.data.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <ItemIcon type={item.type} />

              <div className="min-w-0 flex-1">
                <div className="truncate" title={item.name}>
                  {item.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Deleted {item.deletedAt ? formatRelative(item.deletedAt) : ''}
                  {item.type === 'FILE' && ` · ${formatBytes(item.size)}`}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate(item.id, {
                    onSuccess: (restored) => {
                      // The name may have changed: while the item sat in
                      // the trash, a new folder could have taken its name.
                      const renamed = restored.name !== item.name;
                      const moved = restored.parentId !== item.parentId;

                      if (renamed && moved) {
                        toast.info(
                          `Restored as “${restored.name}” into the room root: its previous folder was deleted`,
                        );
                      } else if (renamed) {
                        toast.info(`Restored as “${restored.name}” — that name was taken`);
                      } else if (moved) {
                        toast.info(
                          `“${restored.name}” was restored into the room root: its previous folder was deleted`,
                        );
                      } else {
                        toast.success(`“${restored.name}” restored`);
                      }
                    },
                    onError: (error) => toast.error(errorMessage(error)),
                  })
                }
              >
                <RotateCcw className="size-3.5" />
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
