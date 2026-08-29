"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

export function Header() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const supabase = createClient();
    const load = async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
      setUnread(count ?? 0);
    };
    void load();
    const channel = supabase.channel(`notifications:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => setUnread((n) => n + 1))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user]);

  const logout = async () => {
    await createClient().auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--ink)] text-sm font-black text-white">GB</span>
          <span><strong className="block">GiveBack</strong><small className="text-[var(--muted)]">good things, second chances</small></span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-bold">
          <Link className="rounded-full px-3 py-2 hover:bg-white" href="/">Discover</Link>
          {user ? <>
            <Link className="rounded-full px-3 py-2 hover:bg-white" href="/dashboard">Dashboard</Link>
            <Link className="relative rounded-full px-3 py-2 hover:bg-white" href="/notifications">Notifications{unread > 0 && <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-[var(--sun)] px-1 text-xs">{unread > 99 ? "99+" : unread}</span>}</Link>
            <Link className="rounded-full px-3 py-2 hover:bg-white" href="/messages">Messages</Link>
            <button onClick={logout} className="rounded-full bg-[var(--ink)] px-4 py-2 text-white">Log out</button>
          </> : <>
            <Link className="rounded-full px-4 py-2 hover:bg-white" href="/login">Log in</Link>
            <Link className="rounded-full bg-[var(--leaf)] px-4 py-2 text-white" href="/signup">Join GiveBack</Link>
          </>}
        </nav>
      </div>
    </header>
  );
}
