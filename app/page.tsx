"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "Books" | "School" | "Clothing" | "Home" | "Electronics" | "Sports" | "Toys & Games" | "Other";
type Condition = "Like new" | "Good" | "Fair";
type Status = "active" | "reserved" | "claimed" | "removed";
type User = { id: string; email?: string; user_metadata?: { display_name?: string } };
type Listing = { id:string; owner_id:string; title:string; category:Category; condition:Condition; area:string; description:string; image_url:string|null; status:Status; created_at:string; profiles?: {display_name:string} | null };
type Request = { id:string; listing_id:string; requester_id:string; message:string; status:string; created_at:string; listings?: {title:string; owner_id:string; area:string} | null; profiles?: {display_name:string} | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://treqbtzxxzlwzucdoiqo.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_yAxVJKn1obRcVFx6eq4fAQ_0Kgn5ZJm";
const SESSION_KEY = "giveback-session-v1";
const categories: Category[] = ["Books","School","Clothing","Home","Electronics","Sports","Toys & Games","Other"];

async function api(path:string, options:RequestInit = {}, token?:string) {
  const headers = new Headers(options.headers);
  headers.set("apikey", SUPABASE_KEY);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${SUPABASE_URL}${path}`, {...options, headers});
  const text = await res.text();
  let data:any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.hint || data?.error || "Request failed");
  return data;
}

function formatDate(value:string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff/60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins/60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours/24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
}

export default function GiveBack() {
  const [user,setUser] = useState<User|null>(null);
  const [token,setToken] = useState<string|null>(null);
  const [listings,setListings] = useState<Listing[]>([]);
  const [saved,setSaved] = useState<Set<string>>(new Set());
  const [requests,setRequests] = useState<Request[]>([]);
  const [search,setSearch] = useState("");
  const [category,setCategory] = useState<"All"|Category>("All");
  const [view,setView] = useState<"discover"|"give"|"dashboard">("discover");
  const [selected,setSelected] = useState<Listing|null>(null);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState<"signin"|"signup">("signin");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState<{type:"ok"|"error";text:string}|null>(null);

  const load = async (accessToken:string|null = token) => {
    setLoading(true);
    try {
      const rows = await api("/rest/v1/listings?select=*,profiles(display_name)&status=in.(active,reserved)&order=created_at.desc",{},accessToken || undefined);
      setListings(rows || []);
      if (accessToken) {
        const me = await api("/auth/v1/user",{},accessToken);
        setUser(me);
        const [sv,outgoing,incoming] = await Promise.all([
          api(`/rest/v1/saved_listings?select=listing_id&user_id=eq.${me.id}`,{},accessToken),
          api(`/rest/v1/requests?select=*,listings(title,owner_id,area)&requester_id=eq.${me.id}&order=created_at.desc`,{},accessToken),
          api(`/rest/v1/requests?select=*,listings!inner(title,owner_id,area)&listings.owner_id=eq.${me.id}&order=created_at.desc`,{},accessToken)
        ]);
        setSaved(new Set((sv||[]).map((x:any)=>x.listing_id)));
        const map = new Map<string,Request>();
        [...(outgoing||[]),...(incoming||[])].forEach((r:any)=>map.set(r.id,r));
        setRequests([...map.values()]);
      } else { setUser(null); setSaved(new Set()); setRequests([]); }
    } catch (e:any) { setNotice({type:"error",text:e.message || "Could not load GiveBack."}); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { load(null); return; }
    try {
      const s = JSON.parse(raw);
      if (s.access_token) { setToken(s.access_token); load(s.access_token); }
      else load(null);
    } catch { localStorage.removeItem(SESSION_KEY); load(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const filtered = useMemo(() => listings.filter(x => {
    const hay = `${x.title} ${x.description} ${x.area} ${x.category}`.toLowerCase();
    return (category === "All" || x.category === category) && hay.includes(search.trim().toLowerCase());
  }),[listings,search,category]);

  const requireAuth = () => { if (!user) { setAuthMode("signin"); setAuthOpen(true); return false; } return true; };

  const toggleSaved = async (id:string) => {
    if (!requireAuth() || !user || !token) return;
    setBusy(true);
    try {
      if (saved.has(id)) {
        await api(`/rest/v1/saved_listings?user_id=eq.${user.id}&listing_id=eq.${id}`,{method:"DELETE"},token);
        setSaved(prev => { const n=new Set(prev); n.delete(id); return n; });
      } else {
        await api("/rest/v1/saved_listings",{method:"POST",body:JSON.stringify({user_id:user.id,listing_id:id})},token);
        setSaved(prev => new Set(prev).add(id));
      }
    } catch(e:any) { setNotice({type:"error",text:e.message}); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    if (token) { try { await api("/auth/v1/logout",{method:"POST"},token); } catch {} }
    localStorage.removeItem(SESSION_KEY); setToken(null); setUser(null); setView("discover"); setRequests([]); setSaved(new Set());
    setNotice({type:"ok",text:"You are signed out."});
  };

  const submitAuth = async (e:FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true); setNotice(null);
    const fd = new FormData(e.currentTarget); const email=String(fd.get("email")||"").trim(); const password=String(fd.get("password")||""); const name=String(fd.get("name")||"").trim();
    try {
      if (authMode === "signup") {
        const data = await api("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password,data:{display_name:name || "GiveBack member"}})});
        if (!data?.access_token) { setAuthOpen(false); setNotice({type:"ok",text:"Account created. Check your email if verification is required, then sign in."}); return; }
        localStorage.setItem(SESSION_KEY,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token})); setToken(data.access_token); setAuthOpen(false); await load(data.access_token); setNotice({type:"ok",text:"Welcome to GiveBack."});
      } else {
        const data = await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
        localStorage.setItem(SESSION_KEY,JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token})); setToken(data.access_token); setAuthOpen(false); await load(data.access_token); setNotice({type:"ok",text:"Welcome back."});
      }
    } catch(e:any) { setNotice({type:"error",text:e.message || "Authentication failed."}); }
    finally { setBusy(false); }
  };

  const createListing = async (e:FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!user || !token) return setAuthOpen(true); setBusy(true); setNotice(null);
    const fd=new FormData(e.currentTarget);
    try {
      await api("/rest/v1/listings",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({owner_id:user.id,title:String(fd.get("title")),category:String(fd.get("category")),condition:String(fd.get("condition")),area:String(fd.get("area")),description:String(fd.get("description")),image_url:String(fd.get("image_url")||"") || null})},token);
      e.currentTarget.reset(); setView("discover"); await load(token); setNotice({type:"ok",text:"Your GiveBack listing is live."});
    } catch(e:any) { setNotice({type:"error",text:e.message || "Could not publish listing."}); }
    finally { setBusy(false); }
  };

  const requestItem = async (e:FormEvent<HTMLFormElement>,listing:Listing) => {
    e.preventDefault(); if (!user || !token) return setAuthOpen(true); setBusy(true);
    const fd=new FormData(e.currentTarget);
    try {
      await api("/rest/v1/requests",{method:"POST",body:JSON.stringify({listing_id:listing.id,requester_id:user.id,message:String(fd.get("message"))})},token);
      setSelected(null); await load(token); setNotice({type:"ok",text:"Request sent. The giver can now review it."});
    } catch(e:any) { setNotice({type:"error",text:e.message || "Could not send request."}); }
    finally { setBusy(false); }
  };

  const changeRequest = async (r:Request, status:"accepted"|"declined"|"cancelled") => {
    if (!token) return; setBusy(true);
    try {
      await api(`/rest/v1/requests?id=eq.${r.id}`,{method:"PATCH",body:JSON.stringify({status})},token);
      if (status === "accepted" && r.listing_id) {
        await api(`/rest/v1/listings?id=eq.${r.listing_id}`,{method:"PATCH",body:JSON.stringify({status:"reserved"})},token);
        await api(`/rest/v1/requests?listing_id=eq.${r.listing_id}&status=eq.pending&id=neq.${r.id}`,{method:"PATCH",body:JSON.stringify({status:"declined"})},token);
      }
      await load(token); setNotice({type:"ok",text: status === "accepted" ? "Request accepted. The listing is reserved." : `Request ${status}.`});
    } catch(e:any) { setNotice({type:"error",text:e.message || "Could not update request."}); }
    finally { setBusy(false); }
  };

  const markClaimed = async (listing:Listing) => {
    if (!token) return; setBusy(true);
    try { await api(`/rest/v1/listings?id=eq.${listing.id}`,{method:"PATCH",body:JSON.stringify({status:"claimed",claimed_at:new Date().toISOString()})},token); await load(token); setNotice({type:"ok",text:"Great — the handover is marked complete."}); }
    catch(e:any) { setNotice({type:"error",text:e.message}); } finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[var(--paper)]">
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color:rgba(246,241,232,.94)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <button onClick={()=>setView("discover")} className="flex items-center gap-3 text-left"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--leaf)] text-xl text-white shadow-sm">↗</span><span><span className="block text-lg font-black tracking-tight">GiveBack</span><span className="block text-xs font-semibold text-[var(--muted)]">Useful things. New homes.</span></span></button>
        <nav className="hidden items-center gap-1 rounded-full border border-[var(--line)] bg-white/60 p-1 md:flex">{([['discover','Discover'],['give','Give something'],['dashboard','My GiveBack']] as const).map(([key,label])=><button key={key} onClick={()=> key==='dashboard' && !user ? setAuthOpen(true) : setView(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${view===key?'bg-[var(--ink)] text-white':'text-[var(--muted)] hover:bg-white'}`}>{label}</button>)}</nav>
        <div className="flex items-center gap-2">{user ? <><span className="hidden max-w-32 truncate text-sm font-bold sm:block">{user.user_metadata?.display_name || user.email}</span><button onClick={signOut} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold">Sign out</button></> : <button onClick={()=>{setAuthMode("signin");setAuthOpen(true)}} className="rounded-full bg-[var(--leaf)] px-4 py-2 text-sm font-bold text-white">Sign in</button>}</div>
      </div>
    </header>

    {notice && <div className="mx-auto mt-4 max-w-7xl px-5 lg:px-8"><div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type==='ok'?'border-green-200 bg-green-50 text-green-800':'border-red-200 bg-red-50 text-red-800'}`}>{notice.text}<button className="float-right" onClick={()=>setNotice(null)} aria-label="Dismiss">×</button></div></div>}

    {view==='discover' && <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end"><div><p className="mb-3 text-sm font-black uppercase tracking-[.2em] text-[var(--leaf)]">A practical sharing network</p><h1 className="max-w-4xl text-5xl font-black tracking-[-.04em] text-[var(--ink)] sm:text-6xl">Give useful things a second life.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">List something you no longer need. Someone nearby can request it, you choose who receives it, and the listing can be marked complete after the handover.</p></div><div className="card p-5"><div className="flex items-center justify-between"><span className="text-sm font-black">What are you looking for?</span><span className="rounded-full bg-[#edf4ea] px-3 py-1 text-xs font-bold text-[var(--leaf-dark)]">{listings.length} live listings</span></div><div className="mt-3 flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search books, desk, uniform…" className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"/><button onClick={()=>setSearch("")} className="rounded-2xl border border-[var(--line)] px-4 text-sm font-bold">Clear</button></div></div></div>
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">{["All",...categories].map(c=><button key={c} onClick={()=>setCategory(c as any)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold ${category===c?'border-[var(--leaf)] bg-[var(--leaf)] text-white':'border-[var(--line)] bg-white text-[var(--muted)]'}`}>{c}</button>)}</div>
      {loading ? <div className="grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-3"><div className="h-72 animate-pulse rounded-3xl bg-white/60"/><div className="h-72 animate-pulse rounded-3xl bg-white/60"/><div className="h-72 animate-pulse rounded-3xl bg-white/60"/></div> : filtered.length===0 ? <div className="card mt-5 p-12 text-center"><div className="text-4xl">🌱</div><h2 className="mt-3 text-2xl font-black">Nothing matches yet.</h2><p className="mx-auto mt-2 max-w-lg text-[var(--muted)]">Try another search, or be the first person to give away something useful in this category.</p><button onClick={()=>{setView("give"); if(!user)setAuthOpen(true)}} className="mt-5 rounded-full bg-[var(--leaf)] px-5 py-3 font-bold text-white">Give something</button></div> : <div className="grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(item=><article key={item.id} className="card overflow-hidden transition hover:-translate-y-1"><button className="block w-full text-left" onClick={()=>setSelected(item)}><div className="aspect-[16/10] bg-[#e8e2d7]">{item.image_url?<img src={item.image_url} alt="" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-5xl">{item.category==='Books'?'📚':item.category==='Clothing'?'👕':item.category==='Home'?'🏠':item.category==='Electronics'?'🔌':item.category==='Sports'?'⚽':item.category==='School'?'🎒':item.category==='Toys & Games'?'🎲':'📦'}</div>}</div><div className="p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#edf4ea] px-3 py-1 text-xs font-black text-[var(--leaf-dark)]">{item.category}</span><span className="text-xs font-bold text-[var(--muted)]">{formatDate(item.created_at)}</span></div><h2 className="mt-3 line-clamp-2 text-xl font-black">{item.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[var(--muted)]"><span className="pill px-3 py-1">{item.condition}</span><span className="pill px-3 py-1">📍 {item.area}</span><span className="pill px-3 py-1">{item.profiles?.display_name || 'GiveBack member'}</span></div></div></button><div className="flex border-t border-[var(--line)]"><button onClick={()=>toggleSaved(item.id)} className="flex-1 px-4 py-3 text-sm font-black">{saved.has(item.id)?'♥ Saved':'♡ Save'}</button><button onClick={()=>{if(requireAuth())setSelected(item)}} className="flex-1 border-l border-[var(--line)] px-4 py-3 text-sm font-black text-[var(--leaf-dark)]">Request</button></div></article>)}</div>}
    </section>}

    {view==='give' && <section className="mx-auto max-w-3xl px-5 pb-16 pt-10 lg:px-8"><div className="mb-8"><button onClick={()=>setView("discover")} className="text-sm font-bold text-[var(--leaf-dark)]">← Back to listings</button><h1 className="mt-5 text-4xl font-black tracking-tight">Give something useful</h1><p className="mt-2 text-[var(--muted)]">Be specific about the item's condition and handover area. Do not publish your home address or private contact details.</p></div>{!user?<div className="card p-8 text-center"><h2 className="text-2xl font-black">Sign in to publish</h2><button onClick={()=>setAuthOpen(true)} className="mt-5 rounded-full bg-[var(--leaf)] px-5 py-3 font-bold text-white">Sign in / create account</button></div>:<form onSubmit={createListing} className="card space-y-5 p-6 sm:p-8"><Field label="Item title" name="title" placeholder="e.g. Scientific calculator" required/><div className="grid gap-5 sm:grid-cols-2"><Field label="Category" name="category" as="select" required options={categories.map(x=>[x,x])}/><Field label="Condition" name="condition" as="select" required options={[["Like new","Like new"],["Good","Good"],["Fair","Fair"]]}/></div><Field label="General area" name="area" placeholder="e.g. Nilai / Bukit Indah" required/><Field label="Description" name="description" as="textarea" placeholder="What is included? Any defects? What should the recipient know?" required/><Field label="Photo URL (optional)" name="image_url" placeholder="https://…"/><button disabled={busy} className="w-full rounded-2xl bg-[var(--leaf)] px-5 py-4 font-black text-white disabled:opacity-50">{busy?'Publishing…':'Publish GiveBack listing'}</button></form>}</section>}

    {view==='dashboard' && <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-8"><h1 className="text-4xl font-black tracking-tight">My GiveBack</h1><p className="mt-2 text-[var(--muted)]">Manage your listings, requests and saved items.</p>{!user?<div className="card mt-8 p-8 text-center"><button onClick={()=>setAuthOpen(true)} className="rounded-full bg-[var(--leaf)] px-5 py-3 font-bold text-white">Sign in</button></div>:<div className="mt-8 grid gap-6 lg:grid-cols-2"><div className="card p-6"><h2 className="text-xl font-black">Your listings</h2><div className="mt-4 space-y-3">{listings.filter(x=>x.owner_id===user.id).length===0?<p className="text-sm text-[var(--muted)]">You have not listed anything yet.</p>:listings.filter(x=>x.owner_id===user.id).map(x=><div key={x.id} className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center justify-between gap-3"><b>{x.title}</b><span className="pill px-3 py-1 text-xs font-bold">{x.status}</span></div>{x.status==='reserved'&&<button disabled={busy} onClick={()=>markClaimed(x)} className="mt-3 rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-bold text-white">Mark handover complete</button>}</div>)}</div></div><div className="card p-6"><h2 className="text-xl font-black">Requests</h2><div className="mt-4 space-y-3">{requests.length===0?<p className="text-sm text-[var(--muted)]">No requests yet.</p>:requests.map(r=><div key={r.id} className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-start justify-between gap-3"><div><b>{r.listings?.title || 'Listing'}</b><p className="mt-1 text-xs text-[var(--muted)]">{r.message}</p></div><span className="pill px-3 py-1 text-xs font-bold">{r.status}</span></div>{r.status==='pending'&&r.requester_id!==user.id&&<div className="mt-3 flex gap-2"><button disabled={busy} onClick={()=>changeRequest(r,"accepted")} className="rounded-full bg-[var(--leaf)] px-4 py-2 text-xs font-bold text-white">Accept</button><button disabled={busy} onClick={()=>changeRequest(r,"declined")} className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-bold">Decline</button></div>}{r.status==='pending'&&r.requester_id===user.id&&<button disabled={busy} onClick={()=>changeRequest(r,"cancelled")} className="mt-2 text-xs font-bold text-red-700">Cancel request</button>}</div>)}</div></div></div>}</section>}

    <footer className="border-t border-[var(--line)]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between lg:px-8"><span><b className="text-[var(--ink)]">GiveBack</b> — a practical way to pass useful things on.</span><span>Never publish private addresses, passwords or sensitive information.</span></div></footer>

    {selected && <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-3 sm:place-items-center" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-[var(--card)] shadow-2xl"><div className="aspect-[16/8] bg-[#e8e2d7]">{selected.image_url?<img src={selected.image_url} alt="" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-6xl">📦</div>}</div><div className="p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><span className="rounded-full bg-[#edf4ea] px-3 py-1 text-xs font-black text-[var(--leaf-dark)]">{selected.category}</span><button onClick={()=>setSelected(null)} className="text-2xl" aria-label="Close">×</button></div><h2 className="mt-4 text-3xl font-black">{selected.title}</h2><p className="mt-3 leading-7 text-[var(--muted)]">{selected.description}</p><div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div className="pill p-3"><b>Condition</b><br/>{selected.condition}</div><div className="pill p-3"><b>Area</b><br/>{selected.area}</div><div className="pill p-3"><b>Giver</b><br/>{selected.profiles?.display_name || 'GiveBack member'}</div></div>{user?.id===selected.owner_id?<p className="mt-6 rounded-2xl bg-[#f2eee6] p-4 text-sm font-semibold">This is your listing. Open <button onClick={()=>{setSelected(null);setView("dashboard")}} className="font-black underline">My GiveBack</button> to manage requests.</p>:selected.status==='reserved'?<p className="mt-6 rounded-2xl bg-[#f2eee6] p-4 text-sm font-semibold">This item is currently reserved.</p>:<form onSubmit={e=>requestItem(e,selected)} className="mt-6"><label className="text-sm font-black">Why would this item help you?</label><textarea name="message" required minLength={10} maxLength={1000} placeholder="Keep it practical. Tell the giver why you would like the item and when you could arrange a safe handover." className="mt-2 min-h-32 w-full rounded-2xl border border-[var(--line)] bg-white p-4 outline-none"/><button disabled={busy} className="mt-3 w-full rounded-2xl bg-[var(--leaf)] px-5 py-4 font-black text-white disabled:opacity-50">{busy?'Sending…':'Send request'}</button></form>}<p className="mt-5 text-xs leading-5 text-[var(--muted)]">Safety: arrange handovers in a public place, avoid sharing your home address, and report listings that appear unsafe or misleading.</p></div></div></div>}

    {authOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"><div className="w-full max-w-md rounded-[28px] bg-[var(--card)] p-6 shadow-2xl sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[var(--leaf)]">GiveBack account</p><h2 className="mt-2 text-2xl font-black">{authMode==='signin'?'Welcome back':'Create your account'}</h2></div><button onClick={()=>setAuthOpen(false)} className="text-2xl">×</button></div><form onSubmit={submitAuth} className="mt-6 space-y-4">{authMode==='signup'&&<Field label="Display name" name="name" placeholder="How should other members see you?" required/>}<Field label="Email" name="email" type="email" placeholder="you@example.com" required/><Field label="Password" name="password" type="password" placeholder="At least 8 characters" minLength={8} required/><button disabled={busy} className="w-full rounded-2xl bg-[var(--leaf)] px-5 py-4 font-black text-white">{busy?'Working…':authMode==='signin'?'Sign in':'Create account'}</button></form><button onClick={()=>setAuthMode(authMode==='signin'?'signup':'signin')} className="mt-4 w-full text-sm font-bold text-[var(--leaf-dark)]">{authMode==='signin'?"New here? Create an account":"Already have an account? Sign in"}</button></div></div>}
  </main>;
}

function Field({label,name,placeholder,required=false,type="text",as="input",options,minLength}:any) {
  const common:any={name,required,placeholder,type,minLength,className:"mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"};
  return <label className="block text-sm font-black">{label}{as==='select'?<select {...common} defaultValue=""><option value="" disabled>Select…</option>{options?.map(([value,text]:string[])=> <option key={value} value={value}>{text}</option>)}</select>:as==='textarea'?<textarea {...common} className={`${common.className} min-h-32`}/>:<input {...common}/>}</label>;
}
