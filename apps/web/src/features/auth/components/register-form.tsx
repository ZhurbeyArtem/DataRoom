import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FormError } from './auth-shell';
import { GoogleSection } from './google-button';
import { errorMessage } from '@/utils/error-message';
import { useRegister } from '../hooks/use-auth-mutations';

const MIN_PASSWORD = 8;

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Довжину перевіряємо й на клієнті: сенсу відправляти свідомо короткий
  // пароль на сервер немає, а відповідь користувач побачить одразу.
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (tooShort) return;
    register.mutate({ name, email, password }, { onSuccess });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Імʼя" htmlFor="name">
        <Input
          id="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      {/* Підказка потрібна до введення; далі її замінює або помилка, або нічого. */}
      <Field
        label="Пароль"
        htmlFor="password"
        hint={password.length === 0 ? `Щонайменше ${MIN_PASSWORD} символів` : undefined}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {tooShort && (
          <p className="text-xs text-destructive">
            Щонайменше {MIN_PASSWORD} символів
          </p>
        )}
      </Field>

      <FormError message={register.isError ? errorMessage(register.error) : null} />

      <Button type="submit" className="w-full" disabled={register.isPending || tooShort}>
        {register.isPending ? 'Створюємо…' : 'Створити акаунт'}
      </Button>

      <GoogleSection />
    </form>
  );
}
