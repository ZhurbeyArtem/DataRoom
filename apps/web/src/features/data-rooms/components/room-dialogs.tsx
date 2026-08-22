import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { DataRoom } from '@/types/api';
import { useCreateRoom, useDeleteRoom, useRenameRoom } from '../hooks/use-data-rooms';

const MAX_NAME = 200;

interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomDialog({ open, onOpenChange }: NameDialogProps) {
  const create = useCreateRoom();
  const [name, setName] = useState('');

  // Поле скидається при кожному відкритті: інакше друга кімната починалася б
  // з назви першої.
  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const trimmed = name.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    create.mutate(trimmed, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Нова кімната</DialogTitle>
            <DialogDescription>
              Кімната належить вам і невидима іншим, доки ви не поділитесь.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              maxLength={MAX_NAME}
              placeholder="Наприклад, Acme Acquisition"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" loading={create.isPending} disabled={!trimmed}>
              {create.isPending ? 'Створюємо…' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenameRoomDialog({
  room,
  onOpenChange,
}: {
  room: DataRoom | null;
  onOpenChange: (open: boolean) => void;
}) {
  const rename = useRenameRoom();
  const [name, setName] = useState('');

  useEffect(() => {
    if (room) setName(room.name);
  }, [room]);

  const trimmed = name.trim();
  const unchanged = trimmed === room?.name;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || unchanged || !room) return;
    rename.mutate({ id: room.id, name: trimmed }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={room !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Перейменувати кімнату</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              maxLength={MAX_NAME}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            {/* Заблокована й на порожньому, і на незміненому імені: запит,
                що нічого не міняє, не має відбуватися. */}
            <Button type="submit" loading={rename.isPending} disabled={!trimmed || unchanged}>
              {rename.isPending ? 'Зберігаємо…' : 'Зберегти'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRoomDialog({
  room,
  onOpenChange,
}: {
  room: DataRoom | null;
  onOpenChange: (open: boolean) => void;
}) {
  const remove = useDeleteRoom();

  return (
    <AlertDialog open={room !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити «{room?.name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Кімнату буде видалено разом з усіма папками, файлами та наданими
            доступами. Це не можна скасувати — на відміну від видалення окремих
            файлів, кімната не потрапляє в кошик.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            loading={remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!room) return;
              remove.mutate(room.id, { onSuccess: () => onOpenChange(false) });
            }}
          >
            {remove.isPending ? 'Видаляємо…' : 'Видалити'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
