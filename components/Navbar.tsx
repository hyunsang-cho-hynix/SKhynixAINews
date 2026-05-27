"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserEmail(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          
          <span className="text-lg font-bold tracking-tight">
            SK hynix AI News
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Home
          </Link>

          <Link
            href="/news-ai"
            className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Search News + AI
          </Link>

          {userEmail && (
            <Link
              href="/settings/topics"
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              My Topics
            </Link>
          )}

          {!userEmail && (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Login
            </Link>
          )}

          {userEmail ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/subscribe"
              className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-200"
            >
              Subscribe
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}