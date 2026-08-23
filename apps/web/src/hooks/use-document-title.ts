import { useEffect } from 'react';

const SUFFIX = 'Data Room';

/**
 * The tab title follows the current folder: with a dozen tabs open, an
 * identical "Data Room" title makes them indistinguishable.
 *
 * `undefined` means "not loaded yet" — in that case keep whatever is there
 * instead of flashing an empty title.
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (title === undefined) return;

    const previous = document.title;
    document.title = title ? `${title} — ${SUFFIX}` : SUFFIX;

    // Restoring the previous value matters during fast navigation: the
    // effect of an unmounted screen must not override the new one's title.
    return () => {
      document.title = previous;
    };
  }, [title]);
}
