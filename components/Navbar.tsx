"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    async function loadUserAndSubscription() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const savedTheme = localStorage.getItem("skhynix-ai-news-theme");
      const metadataTheme = user?.user_metadata?.theme;
      const nextTheme =
        metadataTheme === "light" || metadataTheme === "dark"
          ? metadataTheme
          : savedTheme === "light"
            ? "light"
            : "dark";

      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem("skhynix-ai-news-theme", nextTheme);

      setUserEmail(user?.email ?? null);

      if (!user) {
        setIsSubscribed(false);
        return;
      }

      const { data: preferenceData } = await supabase
        .from("user_topic_preferences")
        .select("is_subscribed")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsSubscribed(Boolean(preferenceData?.is_subscribed));
    }

    loadUserAndSubscription();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAndSubscription();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("skhynix-ai-news-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;

    const { data } = await supabase.auth.getUser();

    if (data.user) {
      await supabase.auth.updateUser({
        data: {
          ...data.user.user_metadata,
          theme: nextTheme,
        },
      });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsSubscribed(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-[#3B3B46] bg-[#26262C]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-base font-bold tracking-tight">
          SK hynix AI News
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/news-ai"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-[#303039] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-[#F47725]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Search News + AI
          </Link>

          <Link
            href="/stock"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-[#303039] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-[#F47725]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3v18h18" />
              <path d="m7 14 4-4 3 3 5-6" />
            </svg>
            Stock
          </Link>

          {!isSubscribed && (
            <Link
              href="/subscribe"
              className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-[#303039] hover:text-white"
            >
              Subscribe
            </Link>
          )}

          {userEmail ? (
            <>
              <Link
                href="/settings/topics"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-300 hover:bg-[#303039] hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-[#F47725]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                My Topics
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-[#454550] px-3 py-2 text-zinc-300 hover:bg-[#303039] hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-[#303039] hover:text-white"
            >
              Login
            </Link>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 px-2 py-2 text-zinc-400 transition hover:text-white">
            <span className="text-xs font-semibold">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
            <input
              type="checkbox"
              checked={theme === "light"}
              onChange={toggleTheme}
              className="sr-only"
              aria-label="Toggle color theme"
            />
            <span
              className={`relative h-5 w-9 rounded-full transition ${
                theme === "light" ? "bg-[#F47725]" : "bg-[#454550]"
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                  theme === "light" ? "left-4" : "left-0.5"
                }`}
              />
            </span>
          </label>
        </nav>
      </div>
    </header>
  );
}
