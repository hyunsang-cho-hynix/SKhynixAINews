"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function unsubscribe() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (!email.trim()) {
        throw new Error("Email is required.");
      }

      const response = await fetch("/api/subscription/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unsubscribe.");
      }

      setMessage("You have been unsubscribed from the daily brief.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to unsubscribe."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl px-6 py-10">
      <div className="rounded-3xl border border-[#454550] bg-[#303039] p-8">
        <h1 className="text-3xl font-bold">Unsubscribe</h1>

        <p className="mt-3 text-slate-400">
          Confirm the email address you want to unsubscribe from the daily news
          brief.
        </p>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your.email@company.com"
          className="mt-6 w-full rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
        />

        <button
          type="button"
          onClick={unsubscribe}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-red-500 px-5 py-3 font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Unsubscribing..." : "Unsubscribe"}
        </button>

        {message && (
          <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-green-200">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            {errorMessage}
          </div>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>
      </div>
    </section>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <Suspense
        fallback={
          <section className="mx-auto max-w-xl px-6 py-10">
            <div className="rounded-3xl border border-[#454550] bg-[#303039] p-8">
              <p className="text-slate-400">Loading unsubscribe page...</p>
            </div>
          </section>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </main>
  );
}