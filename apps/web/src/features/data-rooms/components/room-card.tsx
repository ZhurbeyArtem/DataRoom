import { Link } from '@tanstack/react-router';
import { FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { paths } from '@/config/paths';
import { formatRelative } from '@/utils/format';
import type { DataRoom } from '@/types/api';

interface RoomCardProps {
  room: DataRoom;
  onRename: (room: DataRoom) => void;
  onDelete: (room: DataRoom) => void;
}

export function RoomCard({ room, onRename, onDelete }: RoomCardProps) {
  return (
    <div className="group relative rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20">
      {/* Посилання розтягнуте на всю картку, а меню лежить над ним:
          так клік будь-де відкриває кімнату, але кнопка меню лишається клікабельною. */}
      <Link
        to={paths.room(room.id)}
        className="absolute inset-0 rounded-xl"
        aria-label={`Відкрити ${room.name}`}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <FolderOpen className="size-4.5 text-muted-foreground" />
        </div>

        <div className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 transition-opacity group-hover:opacity-100 data-[popup-open]:opacity-100"
                  aria-label="Дії з кімнатою"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename(room)}>
                <Pencil className="size-4" />
                Перейменувати
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(room)}>
                <Trash2 className="size-4" />
                Видалити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3">
        <div className="truncate font-medium" title={room.name}>
          {room.name}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Створено {formatRelative(room.createdAt)}
        </div>
      </div>
    </div>
  );
}
