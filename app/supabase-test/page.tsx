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
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        <div className="rounded-3xl border border-[#454550] bg-[#303039] p-8">
          <h1 className="text-3xl font-bold">Supabase Connection Test</h1>
          <p className="mt-3 text-slate-400">
            This checks whether the app can connect to Supabase Auth using your
            project URL and public anon key.
          </p>

          <button
            type="button"
            onClick={testSupabaseConnection}
            disabled={loading}
            className="mt-6 rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Testing..." : "Test Supabase Connection"}
          </button>

          {status && (
            <div className="mt-6 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
              <p className="text-slate-200">{status}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}