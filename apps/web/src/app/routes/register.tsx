import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { AuthShell } from '@/features/auth/components/auth-shell';
import { RegisterForm } from '@/features/auth/components/register-form';
import { paths } from '@/config/paths';

export const Route = createFileRoute('/register')({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Створення акаунта"
      subtitle="Кімната належить вам і невидима іншим, доки ви не поділитесь"
      footer={
        <>
          Уже маєте акаунт?{' '}
          <Link to={paths.login} className="font-medium text-foreground underline">
            Увійти
          </Link>
        </>
      }
    >
      <RegisterForm onSuccess={() => void navigate({ to: paths.home })} />
    </AuthShell>
  );
}
