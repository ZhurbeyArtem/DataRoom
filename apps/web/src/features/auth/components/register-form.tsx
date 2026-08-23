import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FormError } from './auth-shell';
import { errorMessage } from '@/utils/error-message';
import { useRegister } from '../hooks/use-auth-mutations';

const MIN_PASSWORD = 8;

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // The length is checked on the client too: there is no point sending a
  // knowingly short password to the server, and the user sees the answer
  // immediately.
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (tooShort) return;
    register.mutate({ name, email, password }, { onSuccess });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Name" htmlFor="name">
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

      {/* The hint is for before typing starts; after that it is replaced by
          an error or by nothing. */}
      <Field
        label="Password"
        htmlFor="password"
        hint={password.length === 0 ? `At least ${MIN_PASSWORD} characters` : undefined}
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
            At least {MIN_PASSWORD} characters
          </p>
        )}
      </Field>

      <FormError message={register.isError ? errorMessage(register.error) : null} />

      <Button type="submit" className="w-full" loading={register.isPending} disabled={tooShort}>
        {register.isPending ? 'Creating…' : 'Create account'}
      </Button>
    </form>
  );
}
