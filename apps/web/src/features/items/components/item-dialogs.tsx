import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
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
import { errorMessage } from '@/utils/error-message';
import { formatBytes } from '@/utils/format';
import { files, folders } from '@/utils/plural';
import type { Item } from '@/types/api';
import {
  useCreateFolder,
  useDeleteItem,
  useMoveItem,
  useRenameItem,
  useSubtreeStats,
} from '../hooks/use-item-mutations';
import { FolderTreePicker } from './folder-tree-picker';

const MAX_NAME = 255;

interface Scope {
  /** Ключ відкритого лістингу: id кімнати для кореня або id папки. */
  scopeId: string;
  /** Реальна папка-батько для нових елементів. */
  parentId: string;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  scope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
}) {
  const create = useCreateFolder();
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const trimmed = name.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;

    create.mutate(
      { parentId: scope.parentId, name: trimmed, scopeId: scope.scopeId },
      {
        onSuccess: (item) => {
          onOpenChange(false);
          // Якщо спрацював авто-суфікс, користувач має побачити фактичне імʼя,
          // а не думати, що створилась папка з тим, яке він вводив.
          if (item.name !== trimmed) {
            toast.info(`Папку створено як «${item.name}» — таке імʼя вже було`);
          }
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Нова папка</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              maxLength={MAX_NAME}
              placeholder="Наприклад, Contracts"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!trimmed || create.isPending}>
              {create.isPending ? 'Створюємо…' : 'Створити'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenameItemDialog({
  item,
  onOpenChange,
  scopeId,
}: {
  item: Item | null;
  onOpenChange: () => void;
  scopeId: string;
}) {
  const rename = useRenameItem();
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!item) return;
    setName(item.name);

    // Виділяємо лише базову частину: користувач майже завжди міняє назву,
    // а не розширення, і не мусить обходити «.pdf» вручну.
    const timer = setTimeout(() => {
      const dot = item.name.lastIndexOf('.');
      const end = item.type === 'FILE' && dot > 0 ? dot : item.name.length;
      input.current?.setSelectionRange(0, end);
    }, 50);

    return () => clearTimeout(timer);
  }, [item]);

  const trimmed = name.trim();
  const unchanged = trimmed === item?.name;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!item || !trimmed || unchanged) return;

    rename.mutate(
      { id: item.id, name: trimmed, scopeId },
      {
        onSuccess: (updated) => {
          onOpenChange();
          if (updated.name !== trimmed) {
            toast.info(`Перейменовано на «${updated.name}» — таке імʼя вже було`);
          }
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              Перейменувати {item?.type === 'FOLDER' ? 'папку' : 'файл'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Input
              ref={input}
              autoFocus
              maxLength={MAX_NAME}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onOpenChange}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!trimmed || unchanged || rename.isPending}>
              {rename.isPending ? 'Зберігаємо…' : 'Зберегти'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoveItemDialog({
  item,
  onOpenChange,
  roomId,
  scopeId,
}: {
  item: Item | null;
  onOpenChange: () => void;
  roomId: string;
  scopeId: string;
}) {
  const move = useMoveItem();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (item) setTarget(null);
  }, [item]);

  const sameParent = target !== null && target === item?.parentId;

  function submit() {
    if (!item || !target) return;

    move.mutate(
      { id: item.id, to: target, scopeId },
      {
        onSuccess: () => {
          onOpenChange();
          toast.success(`«${item.name}» переміщено`);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перемістити «{item?.name}»</DialogTitle>
          <DialogDescription>Оберіть папку призначення</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {item && (
            <FolderTreePicker
              roomId={roomId}
              movedItemId={item.id}
              selectedId={target}
              onSelect={setTarget}
            />
          )}
          {sameParent && (
            <p className="mt-2 text-xs text-muted-foreground">
              Елемент уже лежить у цій папці
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onOpenChange}>
            Скасувати
          </Button>
          <Button disabled={!target || sameParent || move.isPending} onClick={submit}>
            {move.isPending ? 'Переміщуємо…' : 'Перемістити сюди'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteItemDialog({
  item,
  onOpenChange,
  scopeId,
}: {
  item: Item | null;
  onOpenChange: () => void;
  scopeId: string;
}) {
  const remove = useDeleteItem();
  const stats = useSubtreeStats(item?.type === 'FOLDER' ? item.id : null);

  // Саме цього вимагає умова задачі: користувач має бачити, що зникне.
  // Поки числа рахуються, підтвердити не можна — інакше можна погодитись,
  // не побачивши обсягу.
  const isFolder = item?.type === 'FOLDER';
  const waiting = isFolder && stats.isPending;

  const warning = !isFolder
    ? `Файл «${item?.name}» буде переміщено в кошик — звідти його можна відновити.`
    : stats.data
      ? `Разом із папкою в кошик потрапить ${folders(stats.data.folders)} і ${files(stats.data.files)} — ${formatBytes(stats.data.bytes)}. Усе це можна відновити з кошика.`
      : 'Рахуємо, що всередині…';

  return (
    <AlertDialog open={item !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити «{item?.name}»?</AlertDialogTitle>
          <AlertDialogDescription>{warning}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            disabled={waiting || remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!item) return;

              remove.mutate(
                { id: item.id, scopeId },
                {
                  onSuccess: () => {
                    onOpenChange();
                    toast.success(`«${item.name}» у кошику`);
                  },
                  onError: (error) => toast.error(errorMessage(error)),
                },
              );
            }}
          >
            {remove.isPending ? 'Видаляємо…' : 'У кошик'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
