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
 * The last safety net: anything queries and mutations did not catch ends up
 * here. A class component, because React has no hook for this — and probably
 * never will.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The console is the only channel: there is no external error collector
    // in the MVP, and a silent crash in production cannot be investigated.
    console.error('Uncaught render error', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return <ErrorScreen error={error} />;
  }
}

/**
 * The router uses this same screen: an error inside a route is caught by
 * its own boundary, and the outer `ErrorBoundary` never sees it.
 */
export function ErrorScreen({ error }: { error: unknown }) {
  // requestId is the same identifier under which the error is stored in the
  // backend Log table. Without it, a "everything broke for me" complaint
  // cannot be traced to a concrete stack.
  const requestId = error instanceof ApiError ? error.requestId : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        The page crashed on an unexpected error. Try reloading — if it keeps
        happening, send us the code below.
      </p>
      {requestId && (
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
          {requestId}
        </code>
      )}
      <Button className="mt-2" onClick={() => window.location.reload()}>
        Reload the page
      </Button>
    </div>
  );
}
