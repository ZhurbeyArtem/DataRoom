import { FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Один екран на три причини — видалено, доступ відкликано, посилання
 * протермінувалось — і це навмисно. Глядач не має їх розрізняти: різниця
 * між «видалено» і «доступ забрали» вже сама по собі є інформацією про
 * чужу кімнату.
 */
export function AccessDeniedScreen({ onBack }: { onBack?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileX className="size-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium">Цей матеріал більше недоступний</h2>
      <p className="text-sm text-muted-foreground">
        Його видалили, доступ відкликали або термін дії посилання минув.
      </p>
      {onBack && (
        <Button variant="outline" className="mt-2" onClick={onBack}>
          Повернутися назад
        </Button>
      )}
    </div>
  );
}
