import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { paths } from '@/config/paths';
import type { Breadcrumb as Crumb } from '@/types/api';

interface ItemBreadcrumbsProps {
  roomId: string;
  /** Omitted — there is no room crumb at all: a viewer should not have one. */
  roomName?: string;
  /** Ancestor chain from the root; empty when standing at the room root. */
  trail: Crumb[];
  current?: string;
  /** In public mode links point at /shared/<token> rather than at the room. */
  shareToken?: string;
  readOnly?: boolean;
}

/**
 * The first crumb is the room name rather than the root folder: users think
 * in rooms, and the room name is what they typed. The root itself is skipped
 * in the chain.
 */
export function ItemBreadcrumbs({
  roomId,
  roomName,
  trail,
  current,
  shareToken,
  readOnly,
}: ItemBreadcrumbsProps) {
  // For an owner the first crumb is the room name and the root is skipped.
  // For a viewer the root IS the shared item, so nothing may be skipped —
  // otherwise the only crumb they have would disappear.
  const withoutRoot = readOnly ? trail : trail.slice(1);
  const rootHref = shareToken ? paths.publicShare(shareToken) : paths.room(roomId);
  const folderHref = (id: string) =>
    shareToken ? paths.publicFolder(shareToken, id) : paths.folder(roomId, id);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* The room crumb is owner-only: a viewer does not know the name,
            and the link would lead where they are not allowed anyway. */}
        {roomName !== undefined && (
          <BreadcrumbItem>
            {current === undefined && withoutRoot.length === 0 ? (
              <BreadcrumbPage>{roomName}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link to={rootHref} />}>{roomName}</BreadcrumbLink>
            )}
          </BreadcrumbItem>
        )}

        {/* The separator is a sibling of the item rather than its child:
            BreadcrumbSeparator renders an <li>, and nesting it inside another
            <li> would produce invalid HTML. */}
        {withoutRoot.map((crumb) => (
          <Fragment key={crumb.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to={folderHref(crumb.id)} />}>
                {crumb.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}

        {current !== undefined && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
