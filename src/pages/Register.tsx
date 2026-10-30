import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { messageFor } from "@/services/api";
import { authApi } from "@/services/endpoints";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export const passwordProblem = (pw: string): string | null =>
  pw.length < 10
    ? "Use at least 10 characters"
    : pw.toLowerCase() === pw || pw.toUpperCase() === pw || !/\d/.test(pw)
      ? "Mix upper and lower case letters and include a digit"
      : null;

export function RegisterPage() {
  const { me, setMe } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", organization_name: "" });
  const [touched, setTouched] = useState(false);
  const m = useMutation({
    mutationFn: () => authApi.register({ ...f, email: f.email.trim(), organization_name: f.organization_name.trim() }),
    onSuccess: (d) => {
      setMe(d);
      nav("/", { replace: true });
    },
  });
  if (me) return <Navigate to="/" replace />;
  const errs = {
    email: touched && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email address" : null,
    password: touched ? passwordProblem(f.password) : null,
    org: touched && !f.organization_name.trim() ? "Give your workspace a name" : null,
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (/^\S+@\S+\.\S+$/.test(f.email) && !passwordProblem(f.password) && f.organization_name.trim()) m.mutate();
  };
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Self-hosted. Your data never leaves your server."
      footer={
        <>
          Already have an account?{" "}
          <Link className="text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Your name">
          {(id) => <Input id={id} autoComplete="name" value={f.name} onChange={set("name")} />}
        </Field>
        <Field label="Email" error={errs.email}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              value={f.email}
              onChange={set("email")}
              aria-invalid={!!errs.email}
            />
          )}
        </Field>
        <Field
          label="Password"
          hint="At least 10 characters, with upper and lower case letters and a digit."
          error={errs.password}
        >
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={f.password}
              onChange={set("password")}
              aria-invalid={!!errs.password}
            />
          )}
        </Field>
        <Field label="Workspace name" error={errs.org}>
          {(id) => (
            <Input
              id={id}
              value={f.organization_name}
              onChange={set("organization_name")}
              placeholder="Acme Inc."
              aria-invalid={!!errs.org}
            />
          )}
        </Field>
        {m.isError && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {messageFor(m.error)}
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" loading={m.isPending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
