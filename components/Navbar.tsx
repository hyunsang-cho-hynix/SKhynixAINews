"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
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

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/sk_logo.png"
            alt="SK hynix AI News"
            width={30}
            height={30}
            className="rounded-md object-contain"
            priority
          />

          <span className="text-base font-bold tracking-tight">
            SK hynix AI News
          </span>
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

          <Link
            href={userEmail ? "/settings/topics" : "/login"}
            className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-200"
          >
            {userEmail ? "My Account" : "Login"}
          </Link>
        </nav>
      </div>
    </header>
  );
}