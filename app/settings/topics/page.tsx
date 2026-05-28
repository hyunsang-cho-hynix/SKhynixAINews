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

type PreferenceRow = {
  id: string;
  user_id: string;
  email: string;
  mandatory_topics: string[];
  optional_topics: string[];
  send_time: string;
  timezone: string;
  is_subscribed: boolean;
};

export default function TopicSettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [preference, setPreference] = useState<PreferenceRow | null>(null);
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
        setPreference(preferenceData as PreferenceRow);
        setSelectedTopics(preferenceData.optional_topics || []);
        setTimezone(preferenceData.timezone || "America/New_York");
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

      if (!preference) {
        throw new Error("Please subscribe first before managing topics.");
      }

      const { error } = await supabase
        .from("user_topic_preferences")
        .update({
          mandatory_topics: mandatoryTopics,
          optional_topics: selectedTopics,
          timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      setSaved(true);
      await loadUserAndPreferences();
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
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <Navbar />
        <section className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-slate-500">Loading topic preferences...</p>
        </section>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-3xl font-bold">Login Required</h1>
            <p className="mt-3 text-slate-500">
              Please log in to manage your daily news topic preferences.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
              >
                Go to Login
              </Link>

              <Link
                href="/signup"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!preference || !preference.is_subscribed) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-sm">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
              My Topics
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              You are not subscribed yet
            </h1>
            <p className="mt-3 max-w-2xl text-blue-50">
              Create your daily news subscription first. After subscribing, you
              can return here to update your topic preferences.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-600">
              Logged in as <span className="font-semibold">{userEmail}</span>
            </p>

            <Link
              href="/subscribe"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Subscribe to Daily Brief
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-blue-600 hover:text-blue-500"
        >
          ← Back to Home
        </Link>

        <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-100">
            My Topics
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Manage Daily News Topics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
            Choose which optional topics should appear in your daily email
            brief. Mandatory topics are always included.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Subscribed Email</p>
          <p className="mt-1 font-semibold">{userEmail}</p>
          <p className="mt-2 text-xs text-slate-500">
            Daily delivery is targeted around 8:00 AM in your selected time
            zone.
          </p>
        </div>

        {saved && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">
            <h2 className="font-semibold">Topic preferences saved</h2>
            <p className="mt-2 text-sm">
              Your daily brief will include mandatory topics plus{" "}
              {selectedTopics.length > 0
                ? selectedTopics.join(", ")
                : "no optional topics"}
              .
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <h2 className="font-semibold">Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label
            htmlFor="timezone"
            className="mb-2 block text-sm font-semibold text-slate-800"
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
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-500"
          >
            {timezones.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label} ({item.value})
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-slate-500">
            The system will use this time zone for scheduled delivery.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold">Mandatory Topics</h2>
            <p className="mb-5 text-sm text-slate-500">
              These are included for every subscriber.
            </p>

            <div className="space-y-3">
              {mandatoryTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <span className="font-medium">{topic}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Required
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold">Optional Topics</h2>
            <p className="mb-5 text-sm text-slate-500">
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
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-medium">{topic}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isSelected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-200 text-slate-500"
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
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Topic Preferences"}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}