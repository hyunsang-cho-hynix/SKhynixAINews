"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup() {
    setLoading(true);
    setErrorMessage("");
    setMessage("");

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error("Please enter your email and password.");
      }

      if (password.length < 6) {
        throw new Error("Password should be at least 6 characters.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session || data.user) {
        router.push("/subscribe");
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Please check your email to confirm your account, then log in."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSignup();
    }
  }

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-md px-6 py-10">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        <div className="mb-6 overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[#EA002C] via-[#F47725] to-[#F8A23A]" />

          <div className="p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F47725]">
              Create Account
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Join Tech AI News
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Create an account to subscribe to daily technology news briefs and
              manage your topic preferences.
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#F47725]/30 bg-[#F47725]/10 p-5 text-orange-100">
            <h2 className="font-semibold">Account Created</h2>
            <p className="mt-2 text-sm text-orange-100/80">{message}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-[#EA002C]/30 bg-[#EA002C]/10 p-5 text-red-200">
            <h2 className="font-semibold">Signup Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 shadow-sm">
          <div className="mb-5">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-zinc-200"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-[#F47725]"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-zinc-200"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Create a password"
              className="w-full rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-[#F47725]"
            />

            <p className="mt-2 text-xs text-zinc-400">
              Use at least 6 characters.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#ffb17a] hover:text-[#F47725]"
            >
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
