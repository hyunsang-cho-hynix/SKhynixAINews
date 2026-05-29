"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    async function loadUserAndSubscription() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

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

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsSubscribed(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-base font-bold tracking-tight">
          SK hynix AI News
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/news-ai"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
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

          {!isSubscribed && (
            <Link
              href="/subscribe"
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Subscribe
            </Link>
          )}

          {userEmail ? (
            <>
              <Link
                href="/settings/topics"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
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
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}