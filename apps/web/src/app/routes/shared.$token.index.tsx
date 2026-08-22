import { createFileRoute } from '@tanstack/react-router';
import { PublicFolder } from '@/app/public-folder';

export const Route = createFileRoute('/shared/$token/')({ component: PublicRoot });

function PublicRoot() {
  const { token } = Route.useParams();
  return <PublicFolder token={token} />;
}
