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
 * Рендеримо через <iframe>, а не через бібліотеку рендеру PDF: вбудований
 * переглядач браузера дає прокрутку, зум, пошук по документу й друк
 * безкоштовно. Окрема бібліотека коштувала б мегабайтів бандла заради
 * того самого результату.
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
            // Звичайне посилання зі стилями кнопки, а не компонент Button:
            // він або лишає семантику <button>, або додає role="button" —
            // в обох випадках читалка оголосить посилання кнопкою, і
            // «відкрити в новій вкладці» перестане поводитись як посилання.
            <a
              href={link.data.url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <ExternalLink className="size-3.5" />
              Відкрити в новій вкладці
            </a>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {link.isPending && <Skeleton className="m-4 h-[calc(100%-2rem)]" />}

          {link.isError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <h3 className="font-medium">Не вдалося відкрити документ</h3>
              <p className="text-sm text-muted-foreground">{errorMessage(link.error)}</p>
              <Button variant="outline" onClick={() => void link.refetch()}>
                Спробувати ще
              </Button>
            </div>
          )}

          {link.data && (
            <iframe
              src={link.data.url}
              title={item?.name ?? 'Документ'}
              className="size-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
