import { FolderOpen, Inbox, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

export type EmptyVariant = 'empty-room' | 'empty-folder' | 'no-results';

const VARIANTS: Record<EmptyVariant, { icon: ReactNode; title: string; hint: string }> = {
  'empty-room': {
    icon: <Inbox className="size-6 text-muted-foreground" />,
    title: 'Кімната порожня',
    hint: 'Створіть папку або перетягніть сюди PDF-файли, щоб почати',
  },
  'empty-folder': {
    icon: <FolderOpen className="size-6 text-muted-foreground" />,
    title: 'Ця папка порожня',
    hint: 'Створіть підпапку або завантажте файли',
  },
  'no-results': {
    icon: <SearchX className="size-6 text-muted-foreground" />,
    title: 'Нічого не знайдено',
    hint: 'Спробуйте інший запит',
  },
};

/**
 * Три різні порожні стани, а не один спільний: «кімната порожня» і
 * «нічого не знайдено» вимагають від користувача різних дій.
 */
export function ItemsEmptyState({
  variant,
  action,
  readOnly,
}: {
  variant: EmptyVariant;
  action?: ReactNode;
  readOnly?: boolean;
}) {
  const { icon, title, hint } = VARIANTS[variant];

  // Глядачеві не пропонуємо створювати папки: він цього не може, і підказка
  // читалася б як зламана кнопка, якої немає.
  const text = readOnly ? 'Тут поки нічого немає' : hint;

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h2 className="mt-4 font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
