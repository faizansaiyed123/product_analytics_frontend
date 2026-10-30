import { useMutation } from "@tanstack/react-query";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { AuthLayout } from "@/layouts/AuthLayout";
import { messageFor } from "@/services/api";
import { authApi } from "@/services/endpoints";

import { passwordProblem } from "./Register";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const requestReset = useMutation({
    mutationFn: () =>
      authApi.requestReset(email.trim()),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (email) {
      requestReset.mutate();
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll send a reset link if an account exists for that email."
      footer={
        <Link
          className="text-primary hover:underline"
          to="/login"
        >
          Back to sign in
        </Link>
      }
    >
      {requestReset.isSuccess ? (
        <p role="status" className="text-sm">
          If an account exists for{" "}
          <b>{email}</b>, a reset link has been
          sent. On a server without SMTP configured,
          the link is written to the backend log and
          the <code>email_outbox</code> table.
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-4"
        >
          <Field label="Email">
            {(id) => (
              <Input
                id={id}
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            )}
          </Field>

          {requestReset.isError && (
            <p
              role="alert"
              className="text-sm text-danger"
            >
              {messageFor(requestReset.error)}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={requestReset.isPending}
          >
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [searchParams] =
    useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] =
    useState("");

  const resetPassword = useMutation({
    mutationFn: () =>
      authApi.confirmReset(
        searchParams.get("token") ?? "",
        password,
      ),
    onSuccess: () =>
      navigate("/login", {
        replace: true,
      }),
  });

  const problem = password
    ? passwordProblem(password)
    : null;

  const submit = (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!passwordProblem(password)) {
      resetPassword.mutate();
    }
  };

  return (
    <AuthLayout title="Choose a new password">
      <form
        onSubmit={submit}
        className="space-y-4"
      >
        <Field
          label="New password"
          error={problem}
        >
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
            />
          )}
        </Field>

        {resetPassword.isError && (
          <p
            role="alert"
            className="text-sm text-danger"
          >
            {messageFor(resetPassword.error)}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={resetPassword.isPending}
          disabled={!password || !!problem}
        >
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const [searchParams] =
    useSearchParams();

  const verifyEmail = useMutation({
    mutationFn: () =>
      authApi.confirmEmail(
        searchParams.get("token") ?? "",
      ),
  });

  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      verifyEmail.mutate();
    }
  }, [verifyEmail]);

  return (
    <AuthLayout
      title="Email verification"
      footer={
        <Link
          className="text-primary hover:underline"
          to="/"
        >
          Continue
        </Link>
      }
    >
      {verifyEmail.isPending && (
        <p role="status" className="text-sm">
          Verifying…
        </p>
      )}

      {verifyEmail.isSuccess && (
        <p
          role="status"
          className="text-sm text-success"
        >
          Your email address is verified.
        </p>
      )}

      {verifyEmail.isError && (
        <p
          role="alert"
          className="text-sm text-danger"
        >
          {messageFor(verifyEmail.error)}
        </p>
      )}
    </AuthLayout>
  );
}
