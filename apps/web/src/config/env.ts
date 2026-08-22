/**
 * Оточення читається в одному місці й падає одразу на старті, якщо чогось
 * бракує. Інакше про порожній VITE_API_URL дізнаєшся з незрозумілої мережевої
 * помилки посеред роботи.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Не задано ${name}. Перевір apps/web/.env.local`);
  }
  return value;
}

export const env = {
  API_URL: required('VITE_API_URL', import.meta.env.VITE_API_URL as string | undefined),

  /** Вимкнено, доки не заведено OAuth-клієнт у Google Cloud Console. */
  GOOGLE_AUTH_ENABLED: import.meta.env.VITE_GOOGLE_AUTH === 'true',
} as const;
