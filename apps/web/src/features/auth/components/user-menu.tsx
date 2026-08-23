import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '../hooks/use-auth-mutations';
import { useSessionStore } from '../stores/session.store';

export function UserMenu() {
  const user = useSessionStore((state) => state.user);
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <div className="text-sm font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Sign out"
        title="Sign out"
        loading={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {!logout.isPending && <LogOut className="size-4" />}
      </Button>
    </div>
  );
}
