import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/utils/error-message';
import { formatBytes } from '@/utils/format';
import type { Item } from '@/types/api';
import { useDownloadUrl } from '../use-download-url';

/**
 * Rendered in an <iframe> rather than through a PDF rendering library: the
 * browser's built-in viewer gives scrolling, zoom, in-document search and
 * printing for free. A separate library would cost megabytes of bundle for
 * the same result.
 */
export function PdfViewerDialog({
  item,
  onOpenChange,
}: {
  item: Item | null;
  onOpenChange: () => void;
}) {
  const link = useDownloadUrl(item?.id ?? null);

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base" title={item?.name}>
              {item?.name}
            </DialogTitle>
            {item?.size !== null && item?.size !== undefined && (
              <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
            )}
          </div>

          {link.data && (
            // A plain link styled as a button rather than the Button
            // component: that either keeps <button> semantics or adds
            // role="button" — either way a screen reader announces the link
            // as a button, and "open in a new tab" stops behaving like a
            // link.
            <a
              href={link.data.url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <ExternalLink className="size-3.5" />
              Open in a new tab
            </a>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {link.isPending && <Skeleton className="m-4 h-[calc(100%-2rem)]" />}

          {link.isError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <h3 className="font-medium">Could not open the document</h3>
              <p className="text-sm text-muted-foreground">{errorMessage(link.error)}</p>
              <Button variant="outline" onClick={() => void link.refetch()}>
                Try again
              </Button>
            </div>
          )}

          {link.data && (
            <iframe
              src={link.data.url}
              title={item?.name ?? 'Document'}
              className="size-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
