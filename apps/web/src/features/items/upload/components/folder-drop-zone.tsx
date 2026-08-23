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
 * Спільна для обох шляхів аплоаду. Атрибут accept на <input> лише підказує
 * діалогу, що показати першим: користувач перемикає його на «Усі файли»
 * і вибирає будь-що, тому відсіювати доводиться однаково і після вибору
 * кнопкою, і після перетягування.
 */
function acceptPdfs(files: File[], enqueue: (files: File[]) => void): void {
  const pdfs = files.filter((file) => file.type === ACCEPTED);
  const rejected = files.length - pdfs.length;

  if (rejected > 0) {
    toast.warning(
      `Пропущено ${plural(rejected, 'файл', 'файли', 'файлів')}: підтримуються лише PDF`,
    );
  }

  if (pdfs.length > 0) enqueue(pdfs);
}

export function FolderDropZone({ parentId, scopeId, children }: FolderDropZoneProps) {
  const enqueue = useUploadStore((state) => state.enqueue);
  const [dragging, setDragging] = useState(false);
  // Лічильник, а не булеве: dragenter/dragleave спрацьовують і на дочірніх
  // елементах, тож проста прапорцева змінна блимала б при русі курсора.
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
            Відпустіть, щоб завантажити сюди
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Кнопка поруч із drag-and-drop, а не замість нього: перетягування зручне
 * мишею, але недоступне з клавіатури й незручне на тачпаді.
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
          // Скидаємо значення, інакше вибір того самого файлу вдруге
          // не викличе change.
          event.target.value = '';
        }}
      />

      <Button onClick={() => input.current?.click()}>
        <Upload className="size-4" />
        Завантажити
      </Button>
    </>
  );
}
