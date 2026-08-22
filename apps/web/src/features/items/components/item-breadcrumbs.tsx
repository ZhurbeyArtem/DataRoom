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
  roomName: string;
  /** Ланцюжок предків від кореня; порожній, коли ми в корені кімнати. */
  trail: Crumb[];
  current?: string;
}

/**
 * Перша крихта — назва кімнати, а не кореневої папки: користувач мислить
 * кімнатою, і саме її назву він задавав. Сам корінь у ланцюжку пропускаємо.
 */
export function ItemBreadcrumbs({
  roomId,
  roomName,
  trail,
  current,
}: ItemBreadcrumbsProps) {
  const withoutRoot = trail.slice(1);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {current === undefined && withoutRoot.length === 0 ? (
            <BreadcrumbPage>{roomName}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link to={paths.room(roomId)} />}>
              {roomName}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {/* Роздільник — сусід елемента, а не його вміст: BreadcrumbSeparator
            рендерить <li>, і вкладений у <li> він давав би невалідний HTML. */}
        {withoutRoot.map((crumb) => (
          <Fragment key={crumb.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to={paths.folder(roomId, crumb.id)} />}>
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
