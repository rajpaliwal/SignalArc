"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const { isGuest, applyAuthSession, resetAll } = useAppStore();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { access_token, user } = await api.login({ email: email.trim(), password });
      if (isGuest) resetAll(); // logging into a real account replaces any demo session
      applyAuthSession(access_token, user);
      showToast(`Welcome back, ${user.name.split(" ")[0]}.`);
      router.push("/discover");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <span className="text-lg font-semibold">SignalArc</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Log in</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="raj@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

            <Button type="submit" className="w-full justify-center" size="lg" disabled={submitting}>
              {submitting ? "Logging in…" : "Log in"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
