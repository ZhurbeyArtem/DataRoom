import { Button } from '@/components/ui/button';
import { env } from '@/config/env';

/**
 * Поки Google OAuth не налаштований, секція не рендериться взагалі —
 * разом із роздільником. Кнопка, що веде в нікуди, гірша за її відсутність.
 */
export function GoogleSection() {
  if (!env.GOOGLE_AUTH_ENABLED) return null;

  return (
    <>
      <div className="relative py-1 text-center">
        <span className="absolute inset-x-0 top-1/2 border-t" />
        <span className="relative bg-background px-2 text-xs text-muted-foreground">
          або
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          // Повний перехід, а не fetch: OAuth веде через редіректи Google.
          window.location.href = `${env.API_URL}/auth/google`;
        }}
      >
        Увійти через Google
      </Button>
    </>
  );
}
