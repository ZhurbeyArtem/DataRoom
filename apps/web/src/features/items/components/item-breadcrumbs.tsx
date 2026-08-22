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
  /** Не задано — крихти кімнати немає взагалі: у глядача її й не має бути. */
  roomName?: string;
  /** Ланцюжок предків від кореня; порожній, коли ми в корені кімнати. */
  trail: Crumb[];
  current?: string;
  /** У публічному режимі посилання ведуть на /shared/токен, а не в кімнату. */
  shareToken?: string;
  readOnly?: boolean;
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
  shareToken,
  readOnly,
}: ItemBreadcrumbsProps) {
  // У власника перша крихта — назва кімнати, а сам корінь пропускається.
  // У глядача коренем є той елемент, яким поділилися, тому пропускати
  // нічого не можна: інакше зникла б єдина крихта, що в нього є.
  const withoutRoot = readOnly ? trail : trail.slice(1);
  const rootHref = shareToken ? paths.publicShare(shareToken) : paths.room(roomId);
  const folderHref = (id: string) =>
    shareToken ? paths.publicFolder(shareToken, id) : paths.folder(roomId, id);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Крихта кімнати лише у власника: глядач її назви не знає, а
            посилання вело б туди, куди йому все одно заборонено. */}
        {roomName !== undefined && (
          <BreadcrumbItem>
            {current === undefined && withoutRoot.length === 0 ? (
              <BreadcrumbPage>{roomName}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link to={rootHref} />}>{roomName}</BreadcrumbLink>
            )}
          </BreadcrumbItem>
        )}

        {/* Роздільник — сусід елемента, а не його вміст: BreadcrumbSeparator
            рендерить <li>, і вкладений у <li> він давав би невалідний HTML. */}
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
