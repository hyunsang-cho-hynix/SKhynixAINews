"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function testSupabaseConnection() {
    setLoading(true);
    setStatus("");

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setStatus(
        data.session
          ? "Supabase connected. User session found."
          : "Supabase connected. No user logged in yet."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Supabase connection error: ${error.message}`
          : "Unknown Supabase connection error."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-3xl font-bold">Supabase Connection Test</h1>
          <p className="mt-3 text-slate-400">
            This checks whether the app can connect to Supabase Auth using your
            project URL and public anon key.
          </p>

          <button
            type="button"
            onClick={testSupabaseConnection}
            disabled={loading}
            className="mt-6 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Testing..." : "Test Supabase Connection"}
          </button>

          {status && (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-slate-200">{status}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}