import { Upload } from 'lucide-react';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { useUploadStore } from '../upload.store';

const ACCEPTED = 'application/pdf';

interface FolderDropZoneProps {
  parentId: string;
  scopeId: string;
  children: ReactNode;
}

/**
 * Shared by both upload paths. The accept attribute on <input> only hints to
 * the dialog what to show first: users switch it to "All files" and pick
 * anything, so filtering has to happen the same way after a button choice as
 * after a drag and drop.
 */
function acceptPdfs(files: File[], enqueue: (files: File[]) => void): void {
  const pdfs = files.filter((file) => file.type === ACCEPTED);
  const rejected = files.length - pdfs.length;

  if (rejected > 0) {
    toast.warning(
      `Skipped ${plural(rejected, 'file')}: only PDFs are supported`,
    );
  }

  if (pdfs.length > 0) enqueue(pdfs);
}

export function FolderDropZone({ parentId, scopeId, children }: FolderDropZoneProps) {
  const enqueue = useUploadStore((state) => state.enqueue);
  const [dragging, setDragging] = useState(false);
  // A counter rather than a boolean: dragenter/dragleave also fire on child
  // elements, so a plain flag would flicker as the cursor moves.
  const depth = useRef(0);

  function onDrop(event: DragEvent) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    acceptPdfs([...event.dataTransfer.files], (files) =>
      enqueue(files, { parentId, scopeId }),
    );
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        'relative rounded-xl transition-colors',
        dragging && 'outline-2 outline-offset-4 outline-dashed outline-primary',
      )}
    >
      {children}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Upload className="size-4" />
            Drop to upload here
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A button next to drag and drop rather than instead of it: dragging is
 * convenient with a mouse but unavailable from the keyboard and awkward on a
 * trackpad.
 */
export function UploadButton({ parentId, scopeId }: { parentId: string; scopeId: string }) {
  const enqueue = useUploadStore((state) => state.enqueue);
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        multiple
        hidden
        onChange={(event) => {
          acceptPdfs([...(event.target.files ?? [])], (files) =>
            enqueue(files, { parentId, scopeId }),
          );
          // Reset the value, otherwise picking the same file twice would
          // not fire change.
          event.target.value = '';
        }}
      />

      <Button onClick={() => input.current?.click()}>
        <Upload className="size-4" />
        Upload
      </Button>
    </>
  );
}
