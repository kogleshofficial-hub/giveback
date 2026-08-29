"use client";

import { useEffect, useState } from "react";

type User = { id: string; email?: string; user_metadata?: { display_name?: string } };
type Notification = { id: string; type: string; title: string; body: string; listing_id: string | null; request_id: string | null; read_at: string | null; created_at: string };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://treqbtzxxzlwzucdoiqo.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_yAxVJKn1obRcVFx6eq4fAQ_0Kgn5ZJm";
const SESSION_KEY = "giveback-session-v1";

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers); headers.set("apikey", SUPABASE_KEY); headers.set("Content-Type", "application/json"); if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers }); const text = await res.text(); let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.msg || data?.message || data?.hint || data?.error_description || data?.error || "Request failed"); return data;
}

function time(v: string) { return new Date(v).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }

export default function NotificationsPage() {
  const [token, setToken] = useState<string | null>(null); const [user, setUser] = useState<User | null>(null); const [rows, setRows] = useState<Notification[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = async (t: string) => { try { const me = await api("/auth/v1/user", {}, t); setUser(me); setRows(await api(`/rest/v1/notifications?select=*&user_id=eq.${me.id}&order=created_at.desc&limit=100`, {}, t) || []); } catch (e: any) { setError(e.message || "Please sign in again."); } finally { setLoading(false); } };
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}"); if (s.access_token) { setToken(s.access_token); load(s.access_token); } else setLoading(false); } catch { setLoading(false); } }, []);
  const markRead = async (n: Notification) => { if (!token || n.read_at) return; await api(`/rest/v1/notifications?id=eq.${n.id}`, { method: "PATCH", body: JSON.stringify({ read_at: new Date().toISOString() }) }, token); setRows(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)); };
  const markAll = async () => { if (!token || !user) return; await api(`/rest/v1/notifications?user_id=eq.${user.id}&read_at=is.null`, { method: "PATCH", body: JSON.stringify({ read_at: new Date().toISOString() }) }, token); setRows(prev => prev.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() }))); };
  const unread = rows.filter(x => !x.read_at).length;
  return <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]"><header className="border-b border-[var(--line)] bg-white/80"><div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4"><a href="/" className="font-black">← GiveBack</a><div><h1 className="text-xl font-black">Notifications</h1><p className="text-xs text-[var(--muted)]">Real activity from your GiveBack account.</p></div><button onClick={markAll} disabled={!unread} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Mark all read</button></div></header><section className="mx-auto max-w-3xl px-5 py-6">{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error} <a href="/" className="underline">Return to GiveBack</a></div>}{loading ? <div className="space-y-3">{[1,2,3].map(x => <div key={x} className="h-24 animate-pulse rounded-2xl bg-white/70"/>)}</div> : rows.length === 0 ? <div className="card p-10 text-center"><div className="text-4xl">🔔</div><h2 className="mt-3 text-xl font-black">You're all caught up.</h2><p className="mt-2 text-sm text-[var(--muted)]">New requests, accepted requests and private messages will appear here.</p></div> : <div className="space-y-3">{rows.map(n => <button key={n.id} onClick={() => markRead(n)} className={`w-full rounded-2xl border p-5 text-left transition ${n.read_at ? "border-[var(--line)] bg-white" : "border-[var(--leaf)] bg-[#edf4ea]"}`}><div className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-white">{n.type.startsWith("message") ? "💬" : "↗"}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><b>{n.title}</b>{!n.read_at && <i className="h-2 w-2 shrink-0 rounded-full bg-[var(--leaf)]"/>}</span><span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{n.body}</span><span className="mt-2 block text-xs text-[var(--muted)]">{time(n.created_at)}</span></span></div></button>)}</div>}</section></main>;
}
