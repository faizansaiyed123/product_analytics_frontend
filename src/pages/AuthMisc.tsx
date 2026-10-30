import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/layouts/AuthLayout";
import { messageFor } from "@/services/api";
import { authApi } from "@/services/endpoints";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { passwordProblem } from "./Register";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const m = useMutation({ mutationFn: () => authApi.requestReset(email.trim()) });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email) m.mutate();
  };
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll send a reset link if an account exists for that email."
      footer={
        <Link className="text-primary hover:underline" to="/login">
          Back to sign in
        </Link>
      }
    >
      {m.isSuccess ? (
        <p role="status" className="text-sm">
          If an account exists for <b>{email}</b>, a reset link has been sent. On a server without SMTP configured, the
          link is written to the backend log and the <code>email_outbox</code> table.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
          </Field>
          {m.isError && (
            <p role="alert" className="text-sm text-danger">
              {messageFor(m.error)}
            </p>
          )}
          <Button type="submit" variant="primary" className="w-full" loading={m.isPending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const m = useMutation({
    mutationFn: () => authApi.confirmReset(sp.get("token") ?? "", pw),
    onSuccess: () => nav("/login", { replace: true }),
  });
  const problem = pw ? passwordProblem(pw) : null;
  return (
    <AuthLayout title="Choose a new password">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!passwordProblem(pw)) m.mutate();
        }}
        className="space-y-4"
      >
        <Field label="New password" error={problem}>
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          )}
        </Field>
        {m.isError && (
          <p role="alert" className="text-sm text-danger">
            {messageFor(m.error)}
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" loading={m.isPending} disabled={!pw || !!problem}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const [sp] = useSearchParams();
  const m = useMutation({ mutationFn: () => authApi.confirmEmail(sp.get("token") ?? "") });
  const fired = useRef(false);
  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      m.mutate();
    }
  }, [m]);
  return (
    <AuthLayout
      title="Email verification"
      footer={
        <Link className="text-primary hover:underline" to="/">
          Continue
        </Link>
      }
    >
      {m.isPending && (
        <p role="status" className="text-sm">
          Verifying…
        </p>
      )}
      {m.isSuccess && (
        <p role="status" className="text-sm text-success">
          Your email address is verified.
        </p>
      )}
      {m.isError && (
        <p role="alert" className="text-sm text-danger">
          {messageFor(m.error)}
        </p>
      )}
    </AuthLayout>
  );
}
