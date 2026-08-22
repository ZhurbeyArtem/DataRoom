import { Check, Copy, Link2, Mail, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { paths } from '@/config/paths';
import { errorMessage } from '@/utils/error-message';
import type { Share } from '@/types/api';
import type { ShareTarget } from '@/types/share-target';
import { useCreateShare, useRevokeShare, useShares } from '../hooks/use-shares';

const KIND_LABEL: Record<ShareTarget['kind'], string> = {
  room: 'кімнатою',
  folder: 'папкою',
  file: 'файлом',
};

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Безстроково' },
  { value: '24h', label: '24 години' },
  { value: '7d', label: '7 днів' },
];

function expiryToIso(value: string): string | undefined {
  if (value === '24h') return new Date(Date.now() + 24 * 3600_000).toISOString();
  if (value === '7d') return new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
  return undefined;
}

export function ShareDialog({
  target,
  onOpenChange,
}: {
  target: ShareTarget | null;
  onOpenChange: () => void;
}) {
  const shares = useShares(target?.id ?? null);

  const publicLink = shares.data?.find((share) => share.type === 'PUBLIC_LINK');
  const grants = shares.data?.filter((share) => share.type === 'USER_GRANT') ?? [];

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          {/* Заголовок називає рівень конкретно: переплутати, чим саме
              ділишся, найлегше саме тут. */}
          <DialogTitle className="truncate">
            Поділитися {target ? KIND_LABEL[target.kind] : ''} «{target?.name}»
          </DialogTitle>
          <DialogDescription>
            Отримувач бачить вміст лише для читання, включно з усім вкладеним
          </DialogDescription>
        </DialogHeader>

        {shares.isPending ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          target && (
            <div className="space-y-6 py-2">
              <PublicLinkSection itemId={target.id} link={publicLink} />
              <GrantsSection itemId={target.id} grants={grants} />
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

function PublicLinkSection({ itemId, link }: { itemId: string; link?: Share }) {
  const create = useCreateShare(itemId);
  const revoke = useRevokeShare(itemId);
  const [expiry, setExpiry] = useState('never');
  const [copied, setCopied] = useState(false);

  const url = link?.token ? `${window.location.origin}${paths.publicShare(link.token)}` : '';

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Посилання скопійовано');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="size-4" />
        Публічне посилання
      </h3>

      {link ? (
        <>
          <div className="flex gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <Button variant="outline" size="icon" aria-label="Копіювати" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {link.expiresAt
                ? `Діє до ${new Date(link.expiresAt).toLocaleString('uk')}`
                : 'Діє безстроково'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              loading={revoke.isPending}
              onClick={() =>
                revoke.mutate(link.id, {
                  onSuccess: () => toast.success('Посилання вимкнено'),
                  onError: (error) => toast.error(errorMessage(error)),
                })
              }
            >
              Вимкнути
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          {/* Base UI дозволяє null (скидання вибору), а в нас завжди є
              значення за замовчуванням — «безстроково». */}
          <Select value={expiry} onValueChange={(value) => setExpiry(value ?? 'never')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { type: 'PUBLIC_LINK', expiresAt: expiryToIso(expiry) },
                { onError: (error) => toast.error(errorMessage(error)) },
              )
            }
          >
            Створити посилання
          </Button>
        </div>
      )}
    </section>
  );
}

function GrantsSection({ itemId, grants }: { itemId: string; grants: Share[] }) {
  const create = useCreateShare(itemId);
  const revoke = useRevokeShare(itemId);
  const [email, setEmail] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    create.mutate(
      { type: 'USER_GRANT', granteeEmail: trimmed },
      {
        onSuccess: () => {
          setEmail('');
          toast.success(`Доступ надано ${trimmed}`);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Mail className="size-4" />
        Доступ за email
      </h3>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          type="email"
          placeholder="colleague@acme.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          type="submit"
          variant="outline"
          loading={create.isPending}
          disabled={!email.trim()}
        >
          Надати
        </Button>
      </form>

      {/* Не декоративний текст: без нього поведінка виглядає як несправність —
          людина каже «мені нічого не прийшло», хоча доступ уже видано. */}
      <p className="text-xs text-muted-foreground">
        Якщо в цієї людини ще немає акаунта, доступ спрацює одразу після її
        реєстрації з цим email
      </p>

      {grants.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {grants.map((grant) => (
            <li key={grant.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate text-sm">{grant.granteeEmail}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Відкликати доступ ${grant.granteeEmail}`}
                disabled={revoke.isPending}
                onClick={() =>
                  revoke.mutate(grant.id, {
                    onSuccess: () => toast.success('Доступ відкликано'),
                    onError: (error) => toast.error(errorMessage(error)),
                  })
                }
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
