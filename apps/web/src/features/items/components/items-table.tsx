import { useEffect, useRef, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes, formatRelative } from '@/utils/format';
import type { Item } from '@/types/api';
import { ItemIcon } from './item-icon';

interface ItemsTableProps {
  items: Item[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onOpen: (item: Item) => void;
  /**
   * Optional: this is what lets one table serve both the owner and a public
   * viewer. In read-only mode the prop is simply not passed and the actions
   * column does not exist — not hidden with styles, absent.
   */
  renderRowActions?: (item: Item) => ReactNode;
}

export function ItemsTable({
  items,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onOpen,
  renderRowActions,
}: ItemsTableProps) {
  const sentinel = useRef<HTMLTableRowElement>(null);

  // The next page loads when the sentinel row comes into view: the user just
  // scrolls, with no "load more" button.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMore();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, onLoadMore, items.length]);

  return (
    // The table scrolls inside itself; the page never moves sideways.
    <div className="overflow-x-auto rounded-xl border">
      {/* On a narrow screen the secondary columns are hidden, so no minimum
          width is needed there — and there is no scrolling either. */}
      <Table className="sm:min-w-[36rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden w-28 text-right sm:table-cell">Size</TableHead>
            <TableHead className="hidden w-40 sm:table-cell">Modified</TableHead>
            {renderRowActions && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading && <LoadingRows hasActions={renderRowActions !== undefined} />}

          {!isLoading &&
            items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onDoubleClick={() => onOpen(item)}
              >
                <TableCell>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 text-left"
                    onClick={() => onOpen(item)}
                  >
                    <ItemIcon type={item.type} />
                    <span className="truncate" title={item.name}>
                      {item.name}
                    </span>
                  </button>
                </TableCell>

                <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                  {item.type === 'FOLDER' ? '—' : formatBytes(item.size)}
                </TableCell>

                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatRelative(item.updatedAt)}
                </TableCell>

                {renderRowActions && (
                  <TableCell className="text-right">{renderRowActions(item)}</TableCell>
                )}
              </TableRow>
            ))}

          {hasNextPage && (
            <TableRow ref={sentinel}>
              <TableCell
                colSpan={renderRowActions ? 4 : 3}
                className="p-0 text-center text-sm text-muted-foreground"
              >
                {/* A button rather than an empty row: if the observer never
                    fires — a disabled JS API, a battery-saving mode, an
                    unusual browser — the user still has a way to reach the
                    end of the list. It also makes this keyboard-accessible. */}
                <button
                  type="button"
                  className="w-full py-4 hover:text-foreground disabled:opacity-60"
                  disabled={isFetchingNextPage}
                  onClick={onLoadMore}
                >
                  {isFetchingNextPage ? 'Loading…' : 'Show more'}
                </button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/** The skeleton mirrors the row shape instead of spinning in the middle. */
function LoadingRows({ hasActions }: { hasActions: boolean }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <TableRow key={index}>
          <TableCell>
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-4.5 rounded" />
              <Skeleton className="h-4 w-48" />
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Skeleton className="ml-auto h-4 w-14" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          {hasActions && <TableCell />}
        </TableRow>
      ))}
    </>
  );
}
