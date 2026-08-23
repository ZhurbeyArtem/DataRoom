import { FolderOpen, Inbox, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

export type EmptyVariant = 'empty-room' | 'empty-folder' | 'no-results';

const VARIANTS: Record<EmptyVariant, { icon: ReactNode; title: string; hint: string }> = {
  'empty-room': {
    icon: <Inbox className="size-6 text-muted-foreground" />,
    title: 'This room is empty',
    hint: 'Create a folder or drop PDF files here to get started',
  },
  'empty-folder': {
    icon: <FolderOpen className="size-6 text-muted-foreground" />,
    title: 'This folder is empty',
    hint: 'Create a subfolder or upload files',
  },
  'no-results': {
    icon: <SearchX className="size-6 text-muted-foreground" />,
    title: 'Nothing found',
    hint: 'Try a different query',
  },
};

/**
 * Three distinct empty states rather than one shared one: "room is empty"
 * and "nothing found" call for different actions from the user.
 */
export function ItemsEmptyState({
  variant,
  action,
  readOnly,
}: {
  variant: EmptyVariant;
  action?: ReactNode;
  readOnly?: boolean;
}) {
  const { icon, title, hint } = VARIANTS[variant];

  // A viewer is not invited to create folders: they cannot, and the hint
  // would read like a broken button that is not there.
  const text = readOnly ? 'There is nothing here yet' : hint;

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h2 className="mt-4 font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
