import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { errorMessage } from '@/utils/error-message';
import { formatBytes, formatRelative } from '@/utils/format';
import type { Item, SearchResultItem } from '@/types/api';
import { ItemIcon } from '../../components/item-icon';
import { ItemsEmptyState } from '../../components/items-empty-state';
import { PdfViewerDialog } from '../../viewer/components/pdf-viewer-dialog';
import { useSearch } from '../use-search';
import { useState } from 'react';

export function SearchResults({
  roomId,
  query,
  onClear,
}: {
  roomId: string;
  query: string;
  onClear: () => void;
}) {
  const navigate = useNavigate();
  const search = useSearch(roomId, query);
  const [previewing, setPreviewing] = useState<Item | null>(null);

  const results = search.data?.items ?? [];
  const loading = search.isPending || search.settling;

  function open(item: SearchResultItem) {
    if (item.type === 'FOLDER') {
      void navigate({ to: paths.folder(roomId, item.id) });
      return;
    }
    setPreviewing(item);
  }

  if (search.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
        <h2 className="font-medium">Пошук не вдався</h2>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage(search.error)}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <ItemsEmptyState
        variant="no-results"
        action={
          <Button variant="outline" onClick={onClear}>
            Очистити пошук
          </Button>
        }
      />
    );
  }

  return (
    <>
      <ul className="divide-y rounded-xl border">
        {results.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
              onClick={() => open(item)}
            >
              <ItemIcon type={item.type} />

              <div className="min-w-0 flex-1">
                <div className="truncate" title={item.name}>
                  {item.name}
                </div>
                {/* Без розташування два однойменні файли з різних папок
                    у списку не розрізнити. */}
                <div className="truncate text-xs text-muted-foreground">
                  {item.location.map((crumb) => crumb.name).join(' / ') || 'У корені кімнати'}
                </div>
              </div>

              <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                <div className="tabular-nums">
                  {item.type === 'FOLDER' ? '—' : formatBytes(item.size)}
                </div>
                <div>{formatRelative(item.updatedAt)}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {search.hasNextPage && (
        <Button
          variant="ghost"
          className="mt-2 w-full"
          disabled={search.isFetchingNextPage}
          onClick={() => void search.fetchNextPage()}
        >
          {search.isFetchingNextPage ? 'Завантажуємо…' : 'Показати ще'}
        </Button>
      )}

      <PdfViewerDialog item={previewing} onOpenChange={() => setPreviewing(null)} />
    </>
  );
}
