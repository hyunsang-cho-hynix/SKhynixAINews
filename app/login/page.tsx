"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setLoading(true);
    setErrorMessage("");

    try {
      if (!email.trim()) {
        throw new Error("Please enter your email.");
      }

      if (!password.trim()) {
        throw new Error("Please enter your password.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to log in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-md px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        <div className="mb-6 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
            User Login
          </p>
          <h1 className="text-3xl font-bold">Log in to your account</h1>
          <p className="mt-3 text-sm text-blue-50">
            Manage your daily news subscription and topic preferences.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">Login Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        <form className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="mb-5">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your.email@company.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging In..." : "Log In"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-400">
            No account yet?{" "}
            <Link href="/signup" className="text-blue-300 hover:text-blue-200">
              Create account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}