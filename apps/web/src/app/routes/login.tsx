import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { GuestOnly } from "@/features/auth/components/guest-only";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { paths } from "@/config/paths";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();

  return (
    <GuestOnly>
      <AuthShell
        title="Вхід"
        subtitle="Продовжте роботу зі своїми кімнатами"
        footer={
          <>
            Немає акаунта?{" "}
            <Link
              to={paths.register}
              className="font-medium text-foreground underline"
            >
              Зареєструватися
            </Link>
          </>
        }
      >
        <LoginForm onSuccess={() => void navigate({ to: paths.home })} />
      </AuthShell>
    </GuestOnly>
  );
}
