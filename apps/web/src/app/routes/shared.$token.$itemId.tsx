import { createFileRoute } from '@tanstack/react-router';
import { PublicFolder } from '@/app/public-folder';

export const Route = createFileRoute('/shared/$token/$itemId')({ component: PublicFolderPage });

function PublicFolderPage() {
  const { token, itemId } = Route.useParams();
  return <PublicFolder token={token} itemId={itemId} />;
}
