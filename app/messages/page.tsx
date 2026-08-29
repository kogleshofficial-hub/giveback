"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = { id: string; email?: string; user_metadata?: { display_name?: string } };
type RequestRow = { id: string; listing_id: string; requester_id: string; status: string; message: string; listings?: { title: string; owner_id: string; area: string } | null };
type Conversation = { id: string; listing_id: string | null; request_id: string | null; participant_a: string; participant_b: string; updated_at: string; listings?: { title: string } | null };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null; };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://treqbtzxxzlwzucdoiqo.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_yAxVJKn1obRcVFx6eq4fAQ_0Kgn5ZJm";
const SESSION_KEY = "giveback-session-v1";

async function api(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);
  headers.set("apikey", SUPABASE_KEY);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.msg || data?.message || data?.hint || data?.error_description || data?.error || "Request failed");
  return data;
}

function time(value: string) {
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function MessagesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async (accessToken: string) => {
    setLoading(true); setError("");
    try {
      const me = await api("/auth/v1/user", {}, accessToken);
      setUser(me);
      const [accepted, chats] = await Promise.all([
        api(`/rest/v1/requests?select=id,listing_id,requester_id,status,message,listings(title,owner_id,area)&or=(requester_id.eq.${me.id},listings.owner_id.eq.${me.id})&status=eq.accepted&order=created_at.desc`, {}, accessToken),
        api(`/rest/v1/conversations?select=*,listings(title)&or=(participant_a.eq.${me.id},participant_b.eq.${me.id})&order=updated_at.desc`, {}, accessToken),
      ]);
      setRequests(accepted || []);
      setConversations(chats || []);
      if (selected) {
        const fresh = (chats || []).find((x: Conversation) => x.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (e: any) { setError(e.message || "Please sign in again."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { setLoading(false); setError("You need to sign in to use private messages."); return; }
    try {
      const session = JSON.parse(raw);
      if (!session.access_token) throw new Error("No session");
      setToken(session.access_token);
      load(session.access_token);
    } catch { setLoading(false); setError("Your session is unavailable. Sign in again from GiveBack."); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected || !token) return;
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const rows = await api(`/rest/v1/messages?select=*&conversation_id=eq.${selected.id}&order=created_at.asc`, {}, token);
        if (!cancelled) setMessages(rows || []);
        await api(`/rest/v1/messages?conversation_id=eq.${selected.id}&sender_id=neq.${user?.id || "00000000-0000-0000-0000-000000000000"}&read_at=is.null`, { method: "PATCH", body: JSON.stringify({ read_at: new Date().toISOString() }) }, token).catch(() => {});
      } catch (e: any) { if (!cancelled) setError(e.message || "Could not load messages."); }
    };
    loadMessages();
    const interval = window.setInterval(loadMessages, 4000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [selected, token, user?.id]);

  const availableRequests = useMemo(() => requests.filter(r => !conversations.some(c => c.request_id === r.id)), [requests, conversations]);

  const startConversation = async (request: RequestRow) => {
    if (!token || !user || !request.listings) return;
    setBusy(true); setError("");
    try {
      const owner = request.listings.owner_id;
      const requester = request.requester_id;
      const participantA = requester < owner ? requester : owner;
      const participantB = requester < owner ? owner : requester;
      const created = await api("/rest/v1/conversations", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify({ request_id: request.id, listing_id: request.listing_id, participant_a: participantA, participant_b: participantB }),
      }, token);
      const row = created?.[0] || (await api(`/rest/v1/conversations?select=*,listings(title)&request_id=eq.${request.id}`, {}, token))[0];
      if (!row) throw new Error("Could not open the private conversation.");
      const withListing = row.listings ? row : { ...row, listings: { title: request.listings.title } };
      setSelected(withListing); setConversations(prev => [withListing, ...prev.filter(c => c.id !== withListing.id)]);
      await load(token);
    } catch (e: any) { setError(e.message || "Could not start the conversation."); }
    finally { setBusy(false); }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const clean = body.trim();
    if (!clean || !selected || !token || !user) return;
    setBusy(true); setError("");
    try {
      const row = await api("/rest/v1/messages", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ conversation_id: selected.id, sender_id: user.id, body: clean }) }, token);
      setMessages(prev => [...prev, ...(row || [])]);
      setBody("");
      await load(token);
    } catch (e: any) { setError(e.message || "Message could not be sent."); }
    finally { setBusy(false); }
  };

  if (loading) return <main className="min-h-screen bg-[var(--paper)] p-6"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-10 w-48 rounded-xl bg-white/70"/><div className="mt-6 h-[70vh] rounded-3xl bg-white/60"/></div></main>;

  return <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
    <header className="border-b border-[var(--line)] bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4"><a href="/" className="font-black">← GiveBack</a><div><h1 className="text-xl font-black">Private messages</h1><p className="text-xs text-[var(--muted)]">Only available for accepted GiveBack requests.</p></div><button onClick={() => token && load(token)} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold">Refresh</button></div></header>
    <section className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[360px_1fr]">
      {error && <div className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error} <a href="/" className="underline">Return to GiveBack</a></div>}
      <aside className="card overflow-hidden p-0">
        <div className="border-b border-[var(--line)] p-5"><h2 className="font-black">Conversations</h2><p className="mt-1 text-xs text-[var(--muted)]">Your private handover conversations.</p></div>
        <div className="max-h-[65vh] overflow-y-auto">{conversations.length === 0 ? <p className="p-5 text-sm text-[var(--muted)]">No conversations yet. Once a request is accepted, open a private chat below.</p> : conversations.map(c => <button key={c.id} onClick={() => setSelected(c)} className={`w-full border-b border-[var(--line)] p-5 text-left ${selected?.id === c.id ? "bg-[#edf4ea]" : "hover:bg-white"}`}><b className="block truncate">{c.listings?.title || "GiveBack handover"}</b><span className="mt-1 block text-xs text-[var(--muted)]">Updated {time(c.updated_at)}</span></button>)}</div>
        {availableRequests.length > 0 && <div className="border-t border-[var(--line)] p-5"><h3 className="text-sm font-black">Accepted requests ready for chat</h3><div className="mt-3 space-y-2">{availableRequests.map(r => <button key={r.id} disabled={busy} onClick={() => startConversation(r)} className="w-full rounded-2xl border border-[var(--line)] bg-white p-3 text-left text-sm font-bold hover:border-[var(--leaf)] disabled:opacity-50">Open chat · {r.listings?.title || "Listing"}</button>)}</div></div>}
      </aside>
      <section className="card flex min-h-[65vh] flex-col overflow-hidden p-0">
        {!selected ? <div className="grid flex-1 place-items-center p-8 text-center"><div><div className="text-5xl">💬</div><h2 className="mt-4 text-2xl font-black">Choose a conversation</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Private chat becomes available after a giver accepts a request. Keep the conversation focused on the item and safe handover arrangements.</p></div></div> : <><div className="border-b border-[var(--line)] p-5"><h2 className="font-black">{selected.listings?.title || "GiveBack handover"}</h2><p className="mt-1 text-xs text-[var(--muted)]">Private conversation · never share passwords or sensitive information.</p></div><div className="flex-1 space-y-3 overflow-y-auto bg-[#faf8f3] p-5">{messages.length === 0 ? <p className="pt-10 text-center text-sm text-[var(--muted)]">No messages yet. Send a practical first message about arranging the handover.</p> : messages.map(m => <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.sender_id === user?.id ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] bg-white"}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className={`mt-1 text-[10px] ${m.sender_id === user?.id ? "text-white/60" : "text-[var(--muted)]"}`}>{time(m.created_at)}</p></div></div>)}</div><form onSubmit={send} className="border-t border-[var(--line)] bg-white p-4"><div className="flex gap-2"><textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000} placeholder="Write a practical message…" className="min-h-14 flex-1 resize-none rounded-2xl border border-[var(--line)] px-4 py-3 text-sm outline-none"/><button disabled={busy || !body.trim()} className="self-end rounded-2xl bg-[var(--leaf)] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "…" : "Send"}</button></div></form></>}
      </section>
    </section>
  </main>;
}
