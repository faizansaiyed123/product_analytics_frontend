import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Check,
  Layers3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { messageFor } from "@/services/api";
import { authApi } from "@/services/endpoints";

export function LoginPage() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const login = useMutation({
    mutationFn: () =>
      authApi.login(
        email.trim(),
        password,
      ),
    onSuccess: (data) => {
      setMe(data);
      navigate(
        (location.state as any)?.from ?? "/",
        { replace: true },
      );
    },
  });

  if (me) {
    return <Navigate to="/" replace />;
  }

  const emailError =
    touched &&
    !/^\S+@\S+\.\S+$/.test(email)
      ? "Enter a valid email address"
      : null;

  const passwordError =
    touched && !password
      ? "Enter your password"
      : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);

    const validEmail =
      /^\S+@\S+\.\S+$/.test(email);

    if (validEmail && password) {
      login.mutate();
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#10152c] px-10 py-9 text-white lg:flex lg:flex-col xl:px-16">
        <div className="pointer-events-none absolute -left-36 top-36 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-indigo-950/30">
            <BarChart3
              className="h-6 w-6 text-indigo-300"
              strokeWidth={2.2}
            />
          </span>

          <span className="text-lg font-semibold tracking-tight">
            Product
            <span className="text-indigo-300">
              Analytics
            </span>
          </span>

          <span className="ml-2 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            Workspace
          </span>
        </div>

        <div className="relative my-auto max-w-2xl pb-12 pt-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3.5 py-2 text-xs font-medium text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            Clarity in every customer journey
          </div>

          <h1 className="max-w-xl text-5xl font-semibold leading-[1.12] tracking-[-0.045em] xl:text-6xl">
            Turn product signals into{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
              smarter decisions.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Understand what people do, where they get
            stuck, and what keeps them coming back — all
            in one analytics workspace.
          </p>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm xl:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Product engagement
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  A clearer view of your product
                </p>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" />
                Live insights
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#171d38] p-3.5">
                <Users className="mb-3 h-4 w-4 text-indigo-300" />
                <p className="text-[11px] text-slate-400">
                  User behavior
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Understand
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#171d38] p-3.5">
                <Activity className="mb-3 h-4 w-4 text-sky-300" />
                <p className="text-[11px] text-slate-400">
                  Key events
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Measure
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#171d38] p-3.5">
                <Layers3 className="mb-3 h-4 w-4 text-violet-300" />
                <p className="text-[11px] text-slate-400">
                  Funnels & paths
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Improve
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/[0.08] bg-[#171d38]/80 px-4 pb-3 pt-4">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Engagement over time
                </span>
                <span className="text-slate-500">
                  Illustrative preview
                </span>
              </div>

              <svg
                viewBox="0 0 560 100"
                role="img"
                aria-label="Illustrative analytics trend line"
                className="h-24 w-full overflow-visible"
              >
                <defs>
                  <linearGradient
                    id="trendFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#818cf8"
                      stopOpacity=".32"
                    />
                    <stop
                      offset="100%"
                      stopColor="#818cf8"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                {[18, 42, 66, 90].map(
                  (y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="560"
                      y2={y}
                      stroke="white"
                      strokeOpacity=".08"
                      strokeDasharray="4 6"
                    />
                  ),
                )}

                <path
                  d="M0 79 C35 75 45 58 78 64 S125 74 158 48 S205 56 237 38 S282 50 316 30 S365 44 399 22 S449 37 480 18 S526 25 560 7 L560 100 L0 100 Z"
                  fill="url(#trendFill)"
                />
                <path
                  d="M0 79 C35 75 45 58 78 64 S125 74 158 48 S205 56 237 38 S282 50 316 30 S365 44 399 22 S449 37 480 18 S526 25 560 7"
                  fill="none"
                  stroke="#a5b4fc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="399"
                  cy="22"
                  r="4"
                  fill="#c4b5fd"
                  stroke="#171d38"
                  strokeWidth="2"
                />
              </svg>

              <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>Discover patterns</span>
                <span>Find opportunities</span>
                <span>Take action</span>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              Actionable product insights
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              Built for your workflow
            </span>
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-500">
          <span>Make every interaction count.</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Secure workspace access
          </span>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-white px-5 py-7 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex items-center justify-between lg:justify-end">
          <Link
            to="/login"
            className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-slate-900 lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BarChart3 className="h-5 w-5" />
            </span>
            Product Analytics
          </Link>

          <p className="text-sm text-slate-500">
            New to Product Analytics?{" "}
            <Link
              to="/register"
              className="font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              Create account{" "}
              <ArrowUpRight className="mb-0.5 inline h-3.5 w-3.5" />
            </Link>
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <BarChart3 className="h-6 w-6" />
            </div>

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Welcome back
            </p>

            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Sign in to your workspace
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Pick up where you left off and turn your
              product data into your next great decision.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="space-y-5"
            noValidate
          >
            <Field
              label="Email address"
              error={emailError}
            >
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  aria-invalid={!!emailError}
                  placeholder="you@company.com"
                />
              )}
            </Field>

            <Field
              label="Password"
              error={passwordError}
            >
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  aria-invalid={!!passwordError}
                  placeholder="Enter your password"
                />
              )}
            </Field>

            <div className="-mt-1 flex justify-end">
              <Link
                className="text-sm font-medium text-indigo-600 transition hover:text-indigo-700 hover:underline"
                to="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>

            {login.isError && (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {messageFor(login.error)}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full !rounded-xl !py-3 !text-sm !font-semibold !shadow-lg !shadow-indigo-600/15"
              loading={login.isPending}
            >
              Sign in to workspace
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>YOUR DATA. YOUR INSIGHTS.</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">
                A workspace built around your data
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Sign in securely to access your analytics,
                dashboards, and product insights.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row">
          <span>
            © {new Date().getFullYear()} Product Analytics
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Your analytics workspace, ready when you are
          </span>
        </footer>
      </section>
    </main>
  );
}
