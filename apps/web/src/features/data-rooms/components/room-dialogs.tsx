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

  // The field resets on every open: otherwise a second room would start out
  // holding the first one's name.
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
            <DialogTitle>New data room</DialogTitle>
            <DialogDescription>
              The room is yours alone and invisible to others until you share it.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              maxLength={MAX_NAME}
              placeholder="For example, Acme Acquisition"
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
            <DialogTitle>Rename data room</DialogTitle>
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
              Cancel
            </Button>
            {/* Disabled on an empty name and on an unchanged one alike: a
                request that changes nothing should not happen. */}
            <Button type="submit" loading={rename.isPending} disabled={!trimmed || unchanged}>
              {rename.isPending ? 'Saving…' : 'Save'}
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
          <AlertDialogTitle>Delete “{room?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The room will be deleted along with every folder, file and share
            in it. This cannot be undone — unlike deleting individual files, a
            room does not go to the trash.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            loading={remove.isPending}
            onClick={(event) => {
              event.preventDefault();
              if (!room) return;
              remove.mutate(room.id, { onSuccess: () => onOpenChange(false) });
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
