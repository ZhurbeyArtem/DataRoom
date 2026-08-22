import { FolderInput, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Item } from '@/types/api';

interface ItemActionsMenuProps {
  item: Item;
  onRename: (item: Item) => void;
  onMove: (item: Item) => void;
  onDelete: (item: Item) => void;
  /** Не задано — пункт «Поділитися» не рендериться взагалі. */
  onShare?: (item: Item) => void;
}

export function ItemActionsMenu({
  item,
  onRename,
  onMove,
  onDelete,
  onShare,
}: ItemActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={`Дії з «${item.name}»`} />}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onRename(item)}>
          <Pencil className="size-4" />
          Перейменувати
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMove(item)}>
          <FolderInput className="size-4" />
          Перемістити
        </DropdownMenuItem>
        {onShare && (
          <DropdownMenuItem onClick={() => onShare(item)}>
            <Share2 className="size-4" />
            Поділитися
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(item)}>
          <Trash2 className="size-4" />
          Видалити
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
