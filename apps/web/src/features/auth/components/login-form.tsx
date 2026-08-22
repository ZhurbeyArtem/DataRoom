import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FormError } from './auth-shell';
import { GoogleSection } from './google-button';
import { errorMessage } from '@/utils/error-message';
import { useLogin } from '../hooks/use-auth-mutations';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password }, { onSuccess });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
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

      <Field label="Пароль" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <FormError message={login.isError ? errorMessage(login.error) : null} />

      {/* Кнопка блокується на час запиту: подвійний клік не має слати два входи. */}
      <Button type="submit" className="w-full" loading={login.isPending}>
        {login.isPending ? 'Входимо…' : 'Увійти'}
      </Button>

      <GoogleSection />
    </form>
  );
}
