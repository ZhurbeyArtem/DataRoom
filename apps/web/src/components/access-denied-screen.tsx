import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * One screen for three causes — deleted, access revoked, link expired — and
 * that is deliberate. A viewer must not be able to tell them apart: the
 * difference between "deleted" and "access taken away" is itself information
 * about someone else's room.
 */
export function AccessDeniedScreen({ onBack }: { onBack?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileX className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium">This content is no longer available</h2>
      <p className="text-sm text-muted-foreground">
        It was deleted, access was revoked, or the link has expired.
      </p>
      {onBack && (
        <Button variant="outline" className="mt-2" onClick={onBack}>
          Go back
        </Button>
      )}
    </div>
  );
}
