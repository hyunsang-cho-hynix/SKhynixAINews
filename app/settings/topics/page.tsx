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

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Korean", value: "ko" },
  { label: "English + Korean", value: "both" },
];

type PreferenceRow = {
  id: string;
  user_id: string;
  email: string;
  mandatory_topics: string[];
  optional_topics: string[];
  send_time: string;
  timezone: string;
  news_language_preference: string;
  is_subscribed: boolean;
};

export default function TopicSettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [preference, setPreference] = useState<PreferenceRow | null>(null);
  const [timezone, setTimezone] = useState("America/New_York");
  const [newsLanguagePreference, setNewsLanguagePreference] = useState("en");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
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
        setNewsLanguagePreference(
          preferenceData.news_language_preference || "en"
        );
      }

      setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(true);

    setSelectedTopics((currentTopics) =>
      currentTopics.includes(topic)
        ? currentTopics.filter((item) => item !== topic)
        : [...currentTopics, topic]
    );
  }

  function handleTimezoneChange(value: string) {
    setSaved(false);
    setHasUnsavedChanges(true);
    setTimezone(value);
  }

  function handleLanguageChange(value: string) {
    setSaved(false);
    setHasUnsavedChanges(true);
    setNewsLanguagePreference(value);
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
          news_language_preference: newsLanguagePreference,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      setSaved(true);
      setHasUnsavedChanges(false);
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

  async function handleUnsubscribe() {
    const confirmed = window.confirm(
      "Are you sure you want to unsubscribe from the daily news brief?"
    );

    if (!confirmed) {
      return;
    }

    setUnsubscribing(true);
    setSaved(false);
    setUnsubscribed(false);
    setErrorMessage("");

    try {
      if (!userEmail) {
        throw new Error("Email is required to unsubscribe.");
      }

      const response = await fetch("/api/subscription/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unsubscribe.");
      }

      setUnsubscribed(true);
      await loadUserAndPreferences();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to unsubscribe."
      );
    } finally {
      setUnsubscribing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#26262C] text-white">
        <Navbar />
        <section className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-zinc-300">Loading topic preferences...</p>
        </section>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#26262C] text-white">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-white">Login Required</h1>

            <p className="mt-3 text-zinc-300">
              Please log in to manage your daily news topic preferences.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
              >
                Go to Login
              </Link>

              <Link
                href="/signup"
                className="rounded-xl border border-[#454550] bg-[#26262C] px-5 py-3 font-semibold text-zinc-200 hover:bg-[#383843]"
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
      <main className="min-h-screen bg-[#26262C] text-white">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-10">
          <div className="overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm">
            <div className="h-1 w-full bg-gradient-to-r from-[#EA002C] via-[#F47725] to-[#F8A23A]" />

            <div className="p-8">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#F47725]">
                My Topics
              </p>

              <h1 className="text-4xl font-bold tracking-tight text-white">
                You are not subscribed yet
              </h1>

              <p className="mt-3 max-w-2xl text-zinc-300">
                Create your daily news subscription first. After subscribing,
                you can return here to update your topic preferences.
              </p>
            </div>
          </div>

          {unsubscribed && (
            <div className="mt-8 rounded-2xl border border-[#F47725]/30 bg-[#F47725]/10 p-5 text-orange-100">
              <h2 className="font-semibold">Unsubscribed successfully</h2>
              <p className="mt-2 text-sm text-orange-100/80">
                You will no longer receive the daily news brief unless you
                subscribe again.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-8 rounded-2xl border border-[#EA002C]/30 bg-[#EA002C]/10 p-5 text-red-200">
              <h2 className="font-semibold">Error</h2>
              <p className="mt-2 text-sm">{errorMessage}</p>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center shadow-sm">
            <p className="text-zinc-300">
              Logged in as{" "}
              <span className="font-semibold text-white">{userEmail}</span>
            </p>

            <Link
              href="/subscribe"
              className="mt-6 inline-block rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
            >
              Subscribe to Daily Brief
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-8">
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
              My Topics
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Manage Daily News Topics
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Choose your news language, time zone, and optional topics for the
              daily news brief.
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm text-zinc-400">Subscribed Email</p>
            <p className="mt-1 font-semibold text-white">{userEmail}</p>
            <p className="mt-2 text-xs text-zinc-400">
              Changes to language, time zone, and topics are saved together.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                hasUnsavedChanges
                  ? "bg-[#F47725] text-white hover:bg-[#ff8a3d]"
                  : "border border-[#454550] bg-[#26262C] text-zinc-400"
              }`}
            >
              {saving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
            </button>

            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={unsubscribing}
              className="rounded-xl border border-[#EA002C]/30 bg-[#EA002C]/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-[#EA002C]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {unsubscribing ? "Unsubscribing..." : "Unsubscribe"}
            </button>
          </div>
        </div>

        {saved && (
          <div className="mb-6 rounded-2xl border border-[#F47725]/30 bg-[#F47725]/10 p-5 text-orange-100">
            <h2 className="font-semibold">Settings saved</h2>
            <p className="mt-2 text-sm text-orange-100/80">
              Your language, time zone, and topic preferences were saved
              successfully.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-[#EA002C]/30 bg-[#EA002C]/10 p-5 text-red-200">
            <h2 className="font-semibold">Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="mb-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm">
            <label
              htmlFor="newsLanguagePreference"
              className="mb-2 block text-sm font-semibold text-zinc-200"
            >
              News Language
            </label>

            <select
              id="newsLanguagePreference"
              value={newsLanguagePreference}
              onChange={(event) => handleLanguageChange(event.target.value)}
              className="w-full rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white outline-none focus:border-[#F47725]"
            >
              {languageOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-zinc-400">
              This controls the language used in your daily email brief.
            </p>
          </div>

          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm">
            <label
              htmlFor="timezone"
              className="mb-2 block text-sm font-semibold text-zinc-200"
            >
              Time Zone
            </label>

            <select
              id="timezone"
              value={timezone}
              onChange={(event) => handleTimezoneChange(event.target.value)}
              className="w-full rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white outline-none focus:border-[#F47725]"
            >
              {timezones.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} ({item.value})
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-zinc-400">
              The system will use this time zone for scheduled delivery.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-[#454550] bg-[#303039] p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-white">
              Mandatory Topics
            </h2>

            <p className="mb-5 text-sm text-zinc-400">
              These are included for every subscriber.
            </p>

            <div className="space-y-3">
              {mandatoryTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center justify-between rounded-xl border border-[#454550] bg-[#26262C] p-4"
                >
                  <span className="font-medium text-white">{topic}</span>

                  <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                    Required
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#454550] bg-[#303039] p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-white">
              Optional Topics
            </h2>

            <p className="mb-5 text-sm text-zinc-400">
              Turn these on or off, then click Save Changes above.
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
                        ? "border-[#F47725] bg-[#F47725]/10"
                        : "border-[#454550] bg-[#26262C] hover:border-[#F47725]"
                    }`}
                  >
                    <span className="font-medium text-white">{topic}</span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isSelected
                          ? "border border-[#F47725]/30 bg-[#F47725]/10 text-[#ffb17a]"
                          : "border border-[#454550] bg-[#303039] text-zinc-400"
                      }`}
                    >
                      {isSelected ? "On" : "Off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}