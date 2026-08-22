import { createFileRoute } from '@tanstack/react-router';
import { SharedWithMeList } from '@/features/shares/components/shared-with-me-list';

export const Route = createFileRoute('/_authed/shared-with-me')({
  component: SharedWithMePage,
});

function SharedWithMePage() {
  return <SharedWithMeList />;
}
