import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { messageFor } from "@/services/api";
import { authApi } from "@/services/endpoints";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginPage() {
  const { me, setMe } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const m = useMutation({ mutationFn: () => authApi.login(email.trim(), password), onSuccess: (data) => { setMe(data); nav((loc.state as any)?.from ?? "/", { replace: true }); } });
  if (me) return <Navigate to="/" replace />;
  const emailErr = touched && !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email address" : null;
  const pwErr = touched && !password ? "Enter your password" : null;
  const submit = (e: FormEvent) => { e.preventDefault(); setTouched(true); if (/^\S+@\S+\.\S+$/.test(email) && password) m.mutate(); };
  return (
    <AuthLayout title="Sign in" subtitle="Welcome back to your analytics workspace." footer={<>No account? <Link className="text-primary hover:underline" to="/register">Create one</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={emailErr}>{(id) => <Input id={id} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!emailErr} />}</Field>
        <Field label="Password" error={pwErr}>{(id) => <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!pwErr} />}</Field>
        {m.isError && <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{messageFor(m.error)}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={m.isPending}>Sign in</Button>
        <div className="text-center text-sm"><Link className="text-muted-foreground hover:text-foreground" to="/forgot-password">Forgot your password?</Link></div>
      </form>
    </AuthLayout>
  );
}
