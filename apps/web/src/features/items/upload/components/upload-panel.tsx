import { ChevronDown, ChevronUp, RotateCw, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/utils/format';
import { plural } from '@/utils/plural';
import { useUploadStore, type UploadTask } from '../upload.store';

/**
 * Панель живе в шарі застосунку, а не всередині папки: аплоад має
 * продовжуватись, коли користувач перейшов в іншу папку або кімнату.
 */
export function UploadPanel() {
  const tasks = useUploadStore((state) => state.tasks);
  const clearFinished = useUploadStore((state) => state.clearFinished);
  const [collapsed, setCollapsed] = useState(false);

  if (tasks.length === 0) return null;

  const done = tasks.filter((task) => task.status === 'done').length;
  const failed = tasks.filter((task) => task.status === 'error').length;
  const active = tasks.some((task) => task.status === 'uploading' || task.status === 'queued');

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="text-sm font-medium">
          {active
            ? `Завантажено ${done} з ${tasks.length}`
            : failed > 0
              ? `Не вдалося: ${plural(failed, 'файл', 'файли', 'файлів')}`
              : `Готово: ${plural(done, 'файл', 'файли', 'файлів')}`}
        </div>

        <div className="flex items-center gap-1">
          {!active && (
            <Button variant="ghost" size="sm" onClick={clearFinished}>
              Прибрати
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? 'Розгорнути' : 'Згорнути'}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="max-h-72 divide-y overflow-y-auto">
          {tasks.map((task) => (
            <UploadRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadRow({ task }: { task: UploadTask }) {
  const cancel = useUploadStore((state) => state.cancel);
  const retry = useUploadStore((state) => state.retry);

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm" title={task.fileName}>
          {task.fileName}
        </span>

        {task.status === 'uploading' || task.status === 'queued' ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Скасувати ${task.fileName}`}
            onClick={() => cancel(task.id)}
          >
            <X className="size-3.5" />
          </Button>
        ) : task.status === 'error' ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Повторити ${task.fileName}`}
            onClick={() => retry(task.id)}
          >
            <RotateCw className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{formatBytes(task.size)}</span>
        <span>·</span>
        <span className={cn(task.status === 'error' && 'text-destructive')}>
          {statusLabel(task)}
        </span>
      </div>

      {(task.status === 'uploading' || task.status === 'queued') && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${Math.round(task.progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function statusLabel(task: UploadTask): string {
  switch (task.status) {
    case 'queued':
      return 'у черзі';
    case 'uploading':
      return `${Math.round(task.progress * 100)}%`;
    case 'done':
      return 'готово';
    case 'canceled':
      return 'скасовано';
    case 'error':
      return task.error ?? 'помилка';
  }
}
