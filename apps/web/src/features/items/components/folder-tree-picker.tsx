import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useItemsList } from '../hooks/use-items';

interface FolderTreePickerProps {
  /** Root of the tree: the room the move happens within. */
  roomId: string;
  /** What is being moved — it and its whole subtree must be unselectable. */
  movedItemId: string;
  selectedId: string | null;
  onSelect: (folderId: string) => void;
}

export function FolderTreePicker(props: FolderTreePickerProps) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border p-1">
      <TreeLevel {...props} parentId={undefined} depth={0} disabled={false} />
    </div>
  );
}

interface TreeLevelProps extends FolderTreePickerProps {
  parentId: string | undefined;
  depth: number;
  /** We are already inside the moved branch — everything below is barred too. */
  disabled: boolean;
}

function TreeLevel({
  roomId,
  movedItemId,
  selectedId,
  onSelect,
  parentId,
  depth,
  disabled,
}: TreeLevelProps) {
  const listing = useItemsList(parentId ? { parentId } : { dataRoomId: roomId });
  const folders = (listing.data?.items ?? []).filter((item) => item.type === 'FOLDER');

  if (listing.isPending) {
    return <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <>
      {folders.map((folder) => (
        <TreeNode
          key={folder.id}
          id={folder.id}
          name={folder.name}
          depth={depth}
          // The folder being moved and everything under it cannot be
          // chosen: that would detach the branch from the root. The server
          // checks the same invariant, but the user should not run into an
          // error where the UI can simply prevent the mistake.
          disabled={disabled || folder.id === movedItemId}
          selected={selectedId === folder.id}
          onSelect={onSelect}
          roomId={roomId}
          movedItemId={movedItemId}
          selectedId={selectedId}
        />
      ))}
    </>
  );
}

interface TreeNodeProps extends FolderTreePickerProps {
  id: string;
  name: string;
  depth: number;
  disabled: boolean;
  selected: boolean;
}

function TreeNode({
  id,
  name,
  depth,
  disabled,
  selected,
  onSelect,
  roomId,
  movedItemId,
  selectedId,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-md',
          selected && 'bg-accent',
          disabled && 'opacity-40',
        )}
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        <button
          type="button"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="p-1 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>

        <button
          type="button"
          disabled={disabled}
          className="flex flex-1 items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm disabled:cursor-not-allowed"
          onClick={() => onSelect(id)}
        >
          <Folder className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{name}</span>
        </button>
      </div>

      {expanded && (
        <TreeLevel
          roomId={roomId}
          movedItemId={movedItemId}
          selectedId={selectedId}
          onSelect={onSelect}
          parentId={id}
          depth={depth + 1}
          disabled={disabled}
        />
      )}
    </div>
  );
}
