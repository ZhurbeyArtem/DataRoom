import { useEffect } from 'react';

const SUFFIX = 'Data Room';

/**
 * Назва вкладки йде за поточною папкою: з десятком відкритих вкладок
 * однаковий заголовок «Data Room» робить їх нерозрізнюваними.
 *
 * `undefined` означає «ще не завантажилось» — тоді лишаємо те, що є,
 * замість того щоб блимнути порожнім заголовком.
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (title === undefined) return;

    const previous = document.title;
    document.title = title ? `${title} — ${SUFFIX}` : SUFFIX;

    // Повернення попереднього значення важливе при швидкій навігації:
    // ефект розмонтованого екрана не має перебивати заголовок нового.
    return () => {
      document.title = previous;
    };
  }, [title]);
}
