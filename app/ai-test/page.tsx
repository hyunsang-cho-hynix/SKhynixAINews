"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type AiResult = {
  polishedTitle: string;
  topic: string;
  summary: string;
  importanceScore: number;
  reason: string;
};

export default function AiTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState("");

  async function runAiTest() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "HBM Demand Rises as AI Data Centers Continue to Expand",
          description:
            "Demand for high-bandwidth memory continues to grow as AI data centers require faster and more power-efficient memory solutions. Major memory suppliers are increasing investments to support AI infrastructure growth.",
          source: "Demo Semiconductor News",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
            Real Gemini AI Test
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Test AI Summary, Topic, and Importance Score
          </h1>
          <p className="max-w-2xl text-blue-50">
            This page sends a sample article to Gemini and receives a real AI
            generated summary, topic classification, and importance score.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-3 text-xl font-semibold">Sample Input Article</h2>

          <div className="rounded-2xl bg-slate-950 p-5">
            <p className="mb-2 text-sm text-slate-400">Title</p>
            <p className="mb-5 font-semibold">
              HBM Demand Rises as AI Data Centers Continue to Expand
            </p>

            <p className="mb-2 text-sm text-slate-400">Description</p>
            <p className="leading-7 text-slate-300">
              Demand for high-bandwidth memory continues to grow as AI data
              centers require faster and more power-efficient memory solutions.
              Major memory suppliers are increasing investments to support AI
              infrastructure growth.
            </p>
          </div>

          <button
            type="button"
            onClick={runAiTest}
            disabled={loading}
            className="mt-6 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Running Gemini AI..." : "Run AI Processing"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">Error</h2>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-6">
            <h2 className="mb-5 text-2xl font-semibold text-green-200">
              Gemini AI Result
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-green-100/60">Polished Title</p>
                <p className="font-semibold text-green-50">
                  {result.polishedTitle}
                </p>
              </div>

              <div>
                <p className="text-sm text-green-100/60">Topic</p>
                <p className="font-semibold text-green-50">{result.topic}</p>
              </div>

              <div>
                <p className="text-sm text-green-100/60">Summary</p>
                <p className="leading-7 text-green-50">{result.summary}</p>
              </div>

              <div>
                <p className="text-sm text-green-100/60">Importance Score</p>
                <p className="font-semibold text-green-50">
                  {result.importanceScore}/10
                </p>
              </div>

              <div>
                <p className="text-sm text-green-100/60">Reason</p>
                <p className="leading-7 text-green-50">{result.reason}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}