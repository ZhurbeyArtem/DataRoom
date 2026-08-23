import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { GuestOnly } from "@/features/auth/components/guest-only";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { paths } from "@/config/paths";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();

  return (
    <GuestOnly>
      <AuthShell
        title="Create an account"
        subtitle="A room is yours alone and invisible to others until you share it"
        footer={
          <>
            Already have an account?{" "}
            <Link
              to={paths.login}
              className="font-medium text-foreground underline"
            >
              Sign in
            </Link>
          </>
        }
      >
        <RegisterForm onSuccess={() => void navigate({ to: paths.home })} />
      </AuthShell>
    </GuestOnly>
  );
}
