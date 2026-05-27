"use client";

import { useEffect, useState } from "react";
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

export default function TopicSettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadUserAndPreferences();
  }, []);

  async function loadUserAndPreferences() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

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
      } else {
        setSelectedTopics(["Automation", "Robotics", "IT"]);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load topic preferences."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleTopic(topic: string) {
    setSaved(false);

    setSelectedTopics((currentTopics) =>
      currentTopics.includes(topic)
        ? currentTopics.filter((item) => item !== topic)
        : [...currentTopics, topic]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrorMessage("");

    try {
      if (!userId || !userEmail) {
        throw new Error("You must be logged in to save topic preferences.");
      }

      const { error } = await supabase.from("user_topic_preferences").upsert(
        {
          user_id: userId,
          email: userEmail,
          mandatory_topics: mandatoryTopics,
          optional_topics: selectedTopics,
          send_time: "08:00",
          timezone,
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

      setSaved(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save topic preferences."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <section className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-slate-400">Loading topic preferences...</p>
        </section>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h1 className="text-3xl font-bold">Login Required</h1>
            <p className="mt-3 text-slate-400">
              Please log in to manage your daily news topic preferences.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
              >
                Go to Login
              </Link>

              <Link
                href="/signup"
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800"
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

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
            My Topics
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Manage Daily News Topics
          </h1>
          <p className="max-w-2xl text-blue-50">
            Choose which optional topics should appear in your daily email
            brief. Mandatory topics are always included.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Subscribed Email</p>
          <p className="mt-1 font-semibold">{userEmail}</p>
          <p className="mt-2 text-xs text-slate-500">
            Daily delivery is targeted around 8:00 AM in your selected time
            zone.
          </p>
        </div>

        {saved && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-green-200">
            <h2 className="font-semibold">Topic preferences saved</h2>
            <p className="mt-2 text-sm text-green-100/80">
              Your daily brief will include mandatory topics plus{" "}
              {selectedTopics.length > 0
                ? selectedTopics.join(", ")
                : "no optional topics"}
              .
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
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
              setSaved(false);
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
            The system will use this time zone for future scheduled delivery
            logic.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-3 text-xl font-semibold">Mandatory Topics</h2>
            <p className="mb-5 text-sm text-slate-400">
              These are included for every subscriber.
            </p>

            <div className="space-y-3">
              {mandatoryTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4"
                >
                  <span className="font-medium">{topic}</span>
                  <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                    Required
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-3 text-xl font-semibold">Optional Topics</h2>
            <p className="mb-5 text-sm text-slate-400">
              Turn these on or off for your daily brief.
            </p>

            <div className="space-y-3">
              {optionalTopics.map((topic) => {
                const isSelected = selectedTopics.includes(topic);

                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-600"
                    }`}
                  >
                    <span className="font-medium">{topic}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isSelected ? "On" : "Off"}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Topic Preferences"}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}