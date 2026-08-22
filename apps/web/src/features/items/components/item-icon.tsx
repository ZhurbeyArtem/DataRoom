import { FileText, Folder } from 'lucide-react';
import type { ItemType } from '@/types/api';

export function ItemIcon({ type }: { type: ItemType }) {
  return type === 'FOLDER' ? (
    <Folder className="size-4.5 shrink-0 text-muted-foreground" />
  ) : (
    <FileText className="size-4.5 shrink-0 text-muted-foreground" />
  );
}
