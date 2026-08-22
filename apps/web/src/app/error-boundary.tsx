import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Остання сітка безпеки: усе, що не спіймали запити й мутації, доходить сюди.
 * Класовий компонент, бо хуків для цього в React немає — і навряд чи будуть.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Консоль — єдиний канал: зовнішнього збирача помилок в MVP немає,
    // а мовчазне падіння в проді неможливо розслідувати.
    console.error('Незловлена помилка рендера', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorScreen error={error} />;
  }
}

/**
 * Той самий екран використовує роутер: помилку всередині маршруту ловить
 * його власний бар'єр, і зовнішній `ErrorBoundary` її вже не побачить.
 */
export function ErrorScreen({ error }: { error: unknown }) {
  // requestId — той самий ідентифікатор, за яким помилка лежить у таблиці
  // Log на бекенді. Без нього скаргу «в мене все зламалось» не звести
  // до конкретного стеку.
  const requestId = error instanceof ApiError ? error.requestId : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-lg font-medium">Щось пішло не так</h1>
      <p className="text-sm text-muted-foreground">
        Сторінка впала на несподіваній помилці. Спробуйте оновити — якщо
        повторюється, надішліть нам код нижче.
      </p>
      {requestId && (
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
          {requestId}
        </code>
      )}
      <Button className="mt-2" onClick={() => window.location.reload()}>
        Оновити сторінку
      </Button>
    </div>
  );
}
