"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

const mandatoryTopics = ["Semiconductor", "AI", "SK hynix / Memory Industry"];

const optionalTopics = [
  "Automation",
  "Robotics",
  "IT",
  "Cloud",
  "Cybersecurity",
  "Data Center",
  "Manufacturing",
];

const timezones = [
  { label: "Eastern Time", value: "America/New_York" },
  { label: "Central Time", value: "America/Chicago" },
  { label: "Mountain Time", value: "America/Denver" },
  { label: "Pacific Time", value: "America/Los_Angeles" },
  { label: "Korea Time", value: "Asia/Seoul" },
];

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Korean", value: "ko" },
  { label: "English + Korean", value: "both" },
];

export default function SubscribePage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [newsLanguagePreference, setNewsLanguagePreference] = useState("en");
  const [selectedTopics, setSelectedTopics] = useState([
    "Automation",
    "Robotics",
    "IT",
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      const user = data.user;

      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");

        const { data: preferenceData, error: preferenceError } = await supabase
          .from("user_topic_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (preferenceError) {
          throw preferenceError;
        }

        if (preferenceData) {
          setSelectedTopics(preferenceData.optional_topics || []);
          setTimezone(preferenceData.timezone || "America/New_York");
          setNewsLanguagePreference(
            preferenceData.news_language_preference || "en"
          );
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load user."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleTopic(topic: string) {
    setSubmitted(false);

    setSelectedTopics((currentTopics) =>
      currentTopics.includes(topic)
        ? currentTopics.filter((item) => item !== topic)
        : [...currentTopics, topic]
    );
  }

  async function handleSubscribe() {
    setSaving(true);
    setSubmitted(false);
    setErrorMessage("");

    try {
      if (!userId || !email) {
        throw new Error("Please log in or create an account before subscribing.");
      }

      const { error } = await supabase.from("user_topic_preferences").upsert(
        {
          user_id: userId,
          email,
          mandatory_topics: mandatoryTopics,
          optional_topics: selectedTopics,
          send_time: "08:00",
          timezone,
          news_language_preference: newsLanguagePreference,
          is_subscribed: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        throw error;
      }

      setSubmitted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save subscription."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedLanguageLabel =
    languageOptions.find((item) => item.value === newsLanguagePreference)
      ?.label || "English";

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <section className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-slate-400">Loading subscription page...</p>
        </section>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-sm">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
              Newsletter Subscription
            </p>

            <h1 className="mb-4 text-4xl font-bold tracking-tight">
              Subscribe to Daily AI News Brief
            </h1>

            <p className="text-blue-50">
              Log in or create an account to subscribe and manage your daily
              news topics.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-yellow-100 shadow-sm">
            <h2 className="text-2xl font-semibold">Login required</h2>

            <p className="mt-3 text-yellow-100/80">
              Please log in or create an account first. After login, you can
              subscribe to the daily email brief and select your topics.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-slate-200"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-xl border border-yellow-400/40 px-5 py-3 font-semibold text-yellow-100 hover:bg-yellow-500/10"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center text-slate-950 shadow-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold">Subscription Saved</h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your daily news brief subscription has been saved successfully.
            </p>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Email:</span>{" "}
                {email}
              </p>

              <p className="mt-1">
                <span className="font-semibold text-slate-900">Language:</span>{" "}
                {selectedLanguageLabel}
              </p>

              <p className="mt-1">
                <span className="font-semibold text-slate-900">Topics:</span>{" "}
                Mandatory topics
                {selectedTopics.length > 0
                  ? ` plus ${selectedTopics.join(", ")}`
                  : ""}
              </p>

              <p className="mt-1">
                <span className="font-semibold text-slate-900">
                  Time Zone:
                </span>{" "}
                {timezone}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
              >
                Go to Home
              </button>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-100">
            Newsletter Subscription
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Subscribe to Daily AI News Brief
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
            Get a curated daily email covering semiconductor, AI, automation,
            robotics, IT, and selected technology topics.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">Subscription Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        <form className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-sm">
          <div className="mb-8">
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
              readOnly
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
            />

            <p className="mt-2 text-xs text-slate-500">
              This email comes from your logged-in account.
            </p>
          </div>

          <div className="mb-8">
            <label
              htmlFor="newsLanguagePreference"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              News Language
            </label>

            <select
              id="newsLanguagePreference"
              value={newsLanguagePreference}
              onChange={(event) => {
                setSubmitted(false);
                setNewsLanguagePreference(event.target.value);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
            >
              {languageOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              This controls the language used in your daily email brief.
            </p>
          </div>

          <div className="mb-8">
            <label
              htmlFor="timezone"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Time Zone
            </label>

            <select
              id="timezone"
              value={timezone}
              onChange={(event) => {
                setSubmitted(false);
                setTimezone(event.target.value);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
            >
              {timezones.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.value})
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Daily email delivery is targeted around 8:00 AM in your selected
              time zone.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Mandatory Topics</h2>

            <p className="mb-4 text-sm text-slate-400">
              These topics are included in every daily brief.
            </p>

            <div className="space-y-3">
              {mandatoryTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <span className="font-medium text-white">{topic}</span>

                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                    Required
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Optional Topics</h2>

            <p className="mb-4 text-sm text-slate-400">
              Choose additional topics for your daily email.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {optionalTopics.map((topic) => (
                <label
                  key={topic}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-blue-400"
                >
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic)}
                    onChange={() => toggleTopic(topic)}
                    className="h-4 w-4 rounded border-slate-700"
                  />

                  <span>{topic}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubscribe}
            disabled={saving}
            className="w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving Subscription..." : "Subscribe to Daily Brief"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            The daily delivery schedule is managed by the system administrator.
          </p>
        </form>
      </section>
    </main>
  );
}