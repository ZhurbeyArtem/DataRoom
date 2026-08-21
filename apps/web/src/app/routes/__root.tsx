import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <Outlet />
    </div>
  ),
});
