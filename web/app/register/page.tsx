"use client";

import { ArrowLeft, ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { isGuest, applyAuthSession, resetAll } = useAppStore();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [profession, setProfession] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !city.trim() || !country.trim()) {
      setError("Please fill in every field — profession is the only optional one.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { access_token, user } = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        city: city.trim(),
        country: country.trim(),
        profession: profession.trim() || undefined,
      });
      if (isGuest) resetAll(); // converting a demo/guest session starts from a clean graph
      applyAuthSession(access_token, user);
      showToast(`Welcome, ${user.name.split(" ")[0]} — account created.`);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="absolute left-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:left-6 sm:top-6 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <span className="text-lg font-semibold">SignalArc</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Create your profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Step 1 of 2 — we&apos;ll ask about your interests next.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Full name" value={name} onChange={setName} placeholder="Raj Sharma" />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="raj@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={city} onChange={setCity} placeholder="London" />
              <Field label="Country" value={country} onChange={setCountry} placeholder="United Kingdom" />
            </div>
            <Field
              label="Profession (optional)"
              value={profession}
              onChange={setProfession}
              placeholder="AI Engineer"
            />

            {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

            <Button type="submit" className="w-full justify-center" size="lg" disabled={submitting}>
              {submitting ? "Creating account…" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-5 flex items-start gap-2 text-xs text-slate-400">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your password is hashed server-side and never stored in plain text. You can export
            or delete your data at any time from Settings.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
