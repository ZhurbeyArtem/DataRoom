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
  /** Key of the open listing: the room id for a root, or a folder id. */
  scopeId: string;
  /** The actual parent folder for new items. */
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
          // If the automatic suffix kicked in, the user should see the actual
          // name instead of assuming the folder got the one they typed.
          if (item.name !== trimmed) {
            toast.info(`Folder created as “${item.name}” — that name was taken`);
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
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              maxLength={MAX_NAME}
              placeholder="For example, Contracts"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending} disabled={!trimmed}>
              {create.isPending ? 'Creating…' : 'Create'}
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

    // Select the base name only: users almost always change the name rather
    // than the extension, and should not have to step around ".pdf" by
    // hand.
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
            toast.info(`Renamed to “${updated.name}” — that name was taken`);
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
              Rename {item?.type === 'FOLDER' ? 'folder' : 'file'}
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
              Cancel
            </Button>
            <Button type="submit" loading={rename.isPending} disabled={!trimmed || unchanged}>
              {rename.isPending ? 'Saving…' : 'Save'}
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
          toast.success(`“${item.name}” moved`);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move “{item?.name}”</DialogTitle>
          <DialogDescription>Choose a destination folder</DialogDescription>
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
              The item is already in this folder
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onOpenChange}>
            Cancel
          </Button>
          <Button loading={move.isPending} disabled={!target || sameParent} onClick={submit}>
            {move.isPending ? 'Moving…' : 'Move here'}
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

  // This is what the brief asks for: the user must see what will disappear.
  // Confirmation is blocked while the numbers are still being counted —
  // otherwise one could agree without ever seeing the volume.
  const isFolder = item?.type === 'FOLDER';
  const waiting = isFolder && stats.isPending;

  const warning = !isFolder
    ? `The file “${item?.name}” will be moved to the trash — you can restore it from there.`
    : stats.data
      ? `Along with the folder, ${folders(stats.data.folders)} and ${files(stats.data.files)} will go to the trash — ${formatBytes(stats.data.bytes)}. All of it can be restored.`
      : 'Counting what is inside…';

  return (
    <AlertDialog open={item !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{item?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>{warning}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            loading={remove.isPending}
            disabled={waiting}
            onClick={(event) => {
              event.preventDefault();
              if (!item) return;

              remove.mutate(
                { id: item.id, scopeId },
                {
                  onSuccess: () => {
                    onOpenChange();
                    toast.success(`“${item.name}” moved to the trash`);
                  },
                  onError: (error) => toast.error(errorMessage(error)),
                },
              );
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Move to trash'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
