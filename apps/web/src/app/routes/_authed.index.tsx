import { createFileRoute } from '@tanstack/react-router';
import { RoomsGrid } from '@/features/data-rooms/components/rooms-grid';

export const Route = createFileRoute('/_authed/')({ component: RoomsPage });

function RoomsPage() {
  return <RoomsGrid />;
}
