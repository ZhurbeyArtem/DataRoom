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
   * Необовʼязковий: саме через це одна таблиця обслуговує і власника,
   * і публічного глядача. У режимі читання проп просто не передається,
   * і колонка дій не існує — не прихована стилями, а відсутня.
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

  // Довантаження за появою службового рядка в полі зору: користувач просто
  // гортає, без кнопки «показати ще».
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
    // Таблиця скролиться всередині себе, а сторінка ніколи не їде вбік.
    <div className="overflow-x-auto rounded-xl border">
      {/* На вузькому екрані другорядні колонки сховані, тому мінімальна
          ширина там не потрібна — і скролу теж немає. */}
      <Table className="sm:min-w-[36rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Назва</TableHead>
            <TableHead className="hidden w-28 text-right sm:table-cell">Розмір</TableHead>
            <TableHead className="hidden w-40 sm:table-cell">Змінено</TableHead>
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
                {/* Кнопка, а не порожній рядок: якщо спостерігач не спрацює —
                    вимкнений JS-API, режим економії, нестандартний браузер —
                    користувач усе одно має спосіб догорнути список. Заразом
                    це дає доступ із клавіатури. */}
                <button
                  type="button"
                  className="w-full py-4 hover:text-foreground disabled:opacity-60"
                  disabled={isFetchingNextPage}
                  onClick={onLoadMore}
                >
                  {isFetchingNextPage ? 'Завантажуємо…' : 'Показати ще'}
                </button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/** Скелетон повторює форму рядків, а не крутиться по центру таблиці. */
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
