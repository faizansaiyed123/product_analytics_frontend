import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { messageFor } from "@/services/api";
import { authApi } from "@/services/endpoints";

export const passwordProblem = (
  password: string,
): string | null => {
  if (password.length < 10) {
    return "Use at least 10 characters";
  }

  const hasMixedCase =
    password.toLowerCase() !== password &&
    password.toUpperCase() !== password;

  if (!hasMixedCase || !/\d/.test(password)) {
    return "Mix upper and lower case letters and include a digit";
  }

  return null;
};

export function RegisterPage() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organization_name: "",
  });
  const [touched, setTouched] = useState(false);

  const register = useMutation({
    mutationFn: () =>
      authApi.register({
        ...form,
        email: form.email.trim(),
        organization_name:
          form.organization_name.trim(),
      }),
    onSuccess: (data) => {
      setMe(data);
      navigate("/", { replace: true });
    },
  });

  if (me) {
    return <Navigate to="/" replace />;
  }

  const errors = {
    email:
      touched &&
      !/^\S+@\S+\.\S+$/.test(form.email)
        ? "Enter a valid email address"
        : null,
    password: touched
      ? passwordProblem(form.password)
      : null,
    org:
      touched &&
      !form.organization_name.trim()
        ? "Give your workspace a name"
        : null,
  };

  const setField =
    (field: keyof typeof form) =>
    (event: { target: { value: string } }) => {
      setForm({
        ...form,
        [field]: event.target.value,
      });
    };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);

    const validEmail =
      /^\S+@\S+\.\S+$/.test(form.email);

    if (
      validEmail &&
      !passwordProblem(form.password) &&
      form.organization_name.trim()
    ) {
      register.mutate();
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Self-hosted. Your data never leaves your server."
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="text-primary hover:underline"
            to="/login"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={submit}
        className="space-y-4"
        noValidate
      >
        <Field label="Your name">
          {(id) => (
            <Input
              id={id}
              autoComplete="name"
              value={form.name}
              onChange={setField("name")}
            />
          )}
        </Field>

        <Field
          label="Email"
          error={errors.email}
        >
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={setField("email")}
              aria-invalid={!!errors.email}
            />
          )}
        </Field>

        <Field
          label="Password"
          hint="At least 10 characters, with upper and lower case letters and a digit."
          error={errors.password}
        >
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={setField("password")}
              aria-invalid={!!errors.password}
            />
          )}
        </Field>

        <Field
          label="Workspace name"
          error={errors.org}
        >
          {(id) => (
            <Input
              id={id}
              value={form.organization_name}
              onChange={setField(
                "organization_name",
              )}
              placeholder="Acme Inc."
              aria-invalid={!!errors.org}
            />
          )}
        </Field>

        {register.isError && (
          <p
            role="alert"
            className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {messageFor(register.error)}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={register.isPending}
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
