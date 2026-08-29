"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "Books" | "School" | "Clothing" | "Home" | "Electronics" | "Sports" | "Toys & Games";
type Condition = "Like new" | "Good" | "Fair";
type SortMode = "recent" | "nearby" | "title";
type Item = {
  id: string;
  title: string;
  category: Category;
  condition: Condition;
  area: string;
  emoji: string;
  note: string;
  createdAt: number;
  tag: string;
  ownerCreated?: boolean;
};

type FormState = {
  title: string;
  category: Category;
  condition: Condition;
  area: string;
  description: string;
};

const STORAGE_KEY = "giveback-listings-v2";
const SAVED_KEY = "giveback-saved-v2";
const categories: Array<"All" | Category> = ["All", "Books", "School", "Clothing", "Home", "Electronics", "Sports", "Toys & Games"];
const categoryEmoji: Record<Category, string> = {
  Books: "📚",
  School: "🎨",
  Clothing: "👕",
  Home: "🏠",
  Electronics: "🧮",
  Sports: "🎒",
  "Toys & Games": "🎲",
};

const seedItems: Item[] = [
  { id: "seed-1", title: "Form 4 Science Books", category: "Books", condition: "Good", area: "Nearby", emoji: "📚", note: "Useful revision books ready for another student.", createdAt: Date.now() - 2 * 60 * 60 * 1000, tag: "Student pick" },
  { id: "seed-2", title: "Study Desk Lamp", category: "Home", condition: "Like new", area: "Nearby", emoji: "💡", note: "Bright, compact and working perfectly.", createdAt: Date.now() - 5 * 60 * 60 * 1000, tag: "Quick match" },
  { id: "seed-3", title: "Sports Backpack", category: "Sports", condition: "Good", area: "3 km away", emoji: "🎒", note: "Roomy backpack with plenty of life left.", createdAt: Date.now() - 24 * 60 * 60 * 1000, tag: "Popular" },
  { id: "seed-4", title: "Board Game Collection", category: "Toys & Games", condition: "Good", area: "5 km away", emoji: "🎲", note: "A family game night deserves a second round.", createdAt: Date.now() - 25 * 60 * 60 * 1000, tag: "Fun find" },
  { id: "seed-5", title: "Cotton School Uniforms", category: "Clothing", condition: "Good", area: "Nearby", emoji: "👕", note: "Clean uniforms that may help another student.", createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, tag: "Helpful" },
  { id: "seed-6", title: "Plant Pots", category: "Home", condition: "Good", area: "7 km away", emoji: "🪴", note: "Several small pots. Take one or take the set.", createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, tag: "Low waste" },
  { id: "seed-7", title: "Graphing Calculator", category: "Electronics", condition: "Good", area: "4 km away", emoji: "🧮", note: "Still reliable for school maths and science work.", createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, tag: "School" },
  { id: "seed-8", title: "Novel Bundle", category: "Books", condition: "Like new", area: "6 km away", emoji: "📖", note: "A small bundle of stories looking for a new reader.", createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, tag: "Reader pick" },
  { id: "seed-9", title: "Art Supply Box", category: "School", condition: "Good", area: "2 km away", emoji: "🎨", note: "Pens, pencils and supplies with plenty left to use.", createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000, tag: "Creative" },
];

function Icon({ name }: { name: "search" | "arrow" | "heart" | "shield" | "spark" | "plus" | "check" | "share" | "close" | "location" }) {
  const paths = {
    search: "M11 19a8 8 0 1 1 5.3-14A8 8 0 0 1 11 19Zm0-2a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm7.7 3.3-4-4 1.4-1.4 4 4-1.4 1.4Z",
    arrow: "M5 12h13m-6-6 6 6-6 6",
    heart: "M20 8.5c0 5-8 10-8 10S4 13.5 4 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z",
    shield: "M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Zm0 5v8m-3-4h6",
    spark: "m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z",
    plus: "M12 5v14M5 12h14",
    check: "m5 12 4 4L19 6",
    share: "M12 16V4m0 0-4 4m4-4 4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
    close: "M6 6l12 12M18 6 6 18",
    location: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function formatAge(timestamp: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function loadListings(): Item[] {
  if (typeof window === "undefined") return seedItems;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedItems;
    const saved = JSON.parse(raw) as Item[];
    return [...saved, ...seedItems];
  } catch {
    return seedItems;
  }
}

function loadSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export default function Home() {
  const [items, setItems] = useState<Item[]>(seedItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Category>("All");
  const [sort, setSort] = useState<SortMode>("recent");
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [showGive, setShowGive] = useState(false);
  const [toast, setToast] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>({ title: "", category: "Books", condition: "Good", area: "", description: "" });

  useEffect(() => {
    setItems(loadListings());
    setSaved(loadSaved());
    setMounted(true);
  }, []);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter((value) => value !== id) : [...saved, id];
    setSaved(next);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    flash(saved.includes(id) ? "Removed from saved" : "Saved for later");
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = items.filter((item) => {
      const categoryMatch = category === "All" || item.category === category || (category === "School" && item.category === "Books");
      const searchMatch = !normalized || `${item.title} ${item.note} ${item.category} ${item.tag} ${item.area}`.toLowerCase().includes(normalized);
      const savedMatch = !showSavedOnly || saved.includes(item.id);
      return categoryMatch && searchMatch && savedMatch;
    });
    return result.sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "nearby" ? Number(a.area.match(/\d+/)?.[0] ?? 0) - Number(b.area.match(/\d+/)?.[0] ?? 0) : b.createdAt - a.createdAt);
  }, [category, items, query, saved, showSavedOnly, sort]);

  const submitListing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const area = form.area.trim();
    const description = form.description.trim();
    if (title.length < 3 || title.length > 80) return flash("Item name must be 3–80 characters.");
    if (area.length < 2 || area.length > 60) return flash("Please enter a broad area, not an address.");
    if (description.length < 10 || description.length > 500) return flash("Description must be 10–500 characters.");
    const newItem: Item = { id: `local-${crypto.randomUUID()}`, title, category: form.category, condition: form.condition, area, emoji: categoryEmoji[form.category], note: description, createdAt: Date.now(), tag: "Your listing", ownerCreated: true };
    const currentLocal = items.filter((item) => item.ownerCreated);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([newItem, ...currentLocal]));
    setItems((current) => [newItem, ...current]);
    setForm({ title: "", category: "Books", condition: "Good", area: "", description: "" });
    setShowGive(false);
    setCategory("All");
    setShowSavedOnly(false);
    flash("Your listing is live on this browser.");
  };

  const shareItem = async (item: Item) => {
    const url = `${window.location.origin}/?item=${encodeURIComponent(item.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${item.title} · GiveBack`, text: `Someone is giving away ${item.title} on GiveBack.`, url });
      else { await navigator.clipboard.writeText(url); flash("Share link copied."); }
    } catch {
      // Sharing was cancelled; no error message is needed.
    }
  };

  return (
    <main id="top" className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#f8f6f0]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="GiveBack home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ink)] text-white shadow-sm"><span className="text-lg font-black">GB</span></span>
            <span><strong className="block text-lg tracking-tight">GiveBack</strong><span className="text-xs font-medium text-[var(--muted)]">good things, second chances</span></span>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-bold md:flex" aria-label="Main navigation">
            <a href="#discover" className="transition hover:text-[var(--leaf)]">Discover</a><a href="#how" className="transition hover:text-[var(--leaf)]">How it works</a><a href="#safety" className="transition hover:text-[var(--leaf)]">Safety</a>
          </nav>
          <button onClick={() => setShowGive(true)} className="inline-flex items-center gap-2 rounded-full bg-[var(--leaf)] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--leaf-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2"><Icon name="plus" /> Give an item</button>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute -right-32 -top-24 h-80 w-80 rounded-full bg-[#dfe8d5] blur-3xl" />
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cdd9c5] bg-[#edf3e8] px-4 py-2 text-xs font-black uppercase tracking-[.12em] text-[var(--leaf-dark)]"><Icon name="spark" /> Useful things deserve another chance</div>
            <h1 className="max-w-4xl text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl">Give what you no longer need. <span className="text-[var(--leaf)]">Find what you do.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)]">GiveBack is a simple community board for passing useful things forward. No price tags. No pressure. Just better use for things that still have life in them.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="#discover" className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 font-black text-white transition hover:-translate-y-0.5">Explore items <Icon name="arrow" /></a><button onClick={() => setShowGive(true)} className="rounded-full border border-[var(--line)] bg-white px-6 py-3.5 font-black transition hover:bg-[#f3f0e8]">List something useful</button></div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold text-[var(--muted)]"><span className="inline-flex items-center gap-2"><Icon name="check" /> Free to give</span><span className="inline-flex items-center gap-2"><Icon name="check" /> Broad locations</span><span className="inline-flex items-center gap-2"><Icon name="check" /> Privacy-minded</span></div>
          </div>
          <div className="relative rounded-[32px] bg-[var(--ink)] p-3 shadow-2xl sm:p-5">
            <div className="rounded-[25px] bg-[#f5f1e8] p-5 text-[var(--ink)] sm:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[var(--leaf)]">A better handoff</p><h2 className="mt-1 text-2xl font-black">The thing you forgot about could help someone today.</h2></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#dfe9d7] text-[var(--leaf-dark)]"><Icon name="heart" /></span></div>
              <div className="mt-7 space-y-3"><div className="rounded-2xl border border-[var(--line)] bg-white p-4"><div className="flex items-center gap-3"><span className="text-3xl">📚</span><div className="min-w-0"><p className="truncate text-sm font-black">Form 4 Science Books</p><p className="mt-1 text-xs text-[var(--muted)]">Nearby · Good condition</p></div><span className="ml-auto rounded-full bg-[#e7efe1] px-2.5 py-1 text-xs font-black text-[var(--leaf-dark)]">free</span></div></div><div className="ml-8 rounded-2xl bg-[#e7efe1] p-4"><p className="text-sm font-black text-[var(--leaf-dark)]">Someone gets value.</p><p className="mt-1 text-xs leading-5 text-[var(--leaf-dark)]">You get the space back. The item gets another chapter.</p></div></div>
              <p className="mt-6 text-xs font-semibold leading-5 text-[var(--muted)]">GiveBack uses broad areas rather than public home addresses. Always arrange handoffs safely.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="discover" className="border-y border-[var(--line)] bg-[#ebe6da]/70">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--leaf)]">Discover</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Useful things, waiting for a new home.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">Search, filter and save. Your own listings and saves are stored locally in this browser.</p></div><div className="relative w-full lg:max-w-md"><label htmlFor="search" className="sr-only">Search items</label><div className="pointer-events-none absolute left-4 top-3.5 text-[var(--muted)]"><Icon name="search" /></div><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books, lamps, sports..." className="w-full rounded-2xl border border-[var(--line)] bg-white py-3.5 pl-12 pr-4 text-sm font-medium outline-none transition focus:border-[var(--leaf)] focus:ring-2 focus:ring-[#dfe9d7]" /></div></div>
          <div className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Categories">{categories.map((itemCategory) => <button key={itemCategory} onClick={() => setCategory(itemCategory)} aria-pressed={category === itemCategory} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] ${category === itemCategory ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] bg-white/80 hover:bg-white"}`}>{itemCategory}</button>)}</div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold text-[var(--muted)]">{filtered.length} {filtered.length === 1 ? "item" : "items"}{showSavedOnly ? " saved" : " available to explore"}</p><div className="flex flex-wrap gap-2"><button onClick={() => setShowSavedOnly((value) => !value)} aria-pressed={showSavedOnly} className={`rounded-full px-4 py-2 text-sm font-black ${showSavedOnly ? "bg-[var(--leaf-dark)] text-white" : "border border-[var(--line)] bg-white"}`}>♥ Saved {mounted && saved.length > 0 ? `(${saved.length})` : ""}</button><label className="sr-only" htmlFor="sort">Sort items</label><select id="sort" value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold outline-none"><option value="recent">Newest first</option><option value="nearby">Nearest first</option><option value="title">A–Z</option></select></div></div>
          {filtered.length > 0 ? <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <article key={item.id} className="group overflow-hidden rounded-[26px] border border-[var(--line)] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            <button className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--leaf)]" onClick={() => setSelected(item)} aria-label={`View ${item.title}`}><div className="relative flex h-48 items-center justify-center bg-[#ded9cc] text-7xl"><span aria-hidden="true">{item.emoji}</span><span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[var(--ink)]">{item.tag}</span><span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[var(--muted)]">{formatAge(item.createdAt)}</span></div><div className="p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#e9f0e4] px-2.5 py-1 text-xs font-black text-[var(--leaf-dark)]">{item.condition}</span><span className="text-xs font-bold text-[var(--muted)]">{item.category}</span></div><h3 className="mt-4 text-lg font-black tracking-tight">{item.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{item.note}</p><div className="mt-5 flex items-center gap-2 text-xs font-bold text-[var(--muted)]"><Icon name="location" /> {item.area}</div></div></button>
            <div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-3"><button onClick={() => toggleSaved(item.id)} aria-label={saved.includes(item.id) ? `Remove ${item.title} from saved` : `Save ${item.title}`} className={`inline-flex items-center gap-2 text-sm font-black ${saved.includes(item.id) ? "text-[var(--leaf-dark)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}><Icon name="heart" /> {saved.includes(item.id) ? "Saved" : "Save"}</button><button onClick={() => shareItem(item)} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black text-[var(--muted)] hover:bg-[#f1eee7] hover:text-[var(--ink)]"><Icon name="share" /> Share</button></div>
          </article>)}</div> : <div className="mt-5 rounded-[26px] border border-dashed border-[var(--line)] bg-white/70 p-10 text-center"><div className="text-4xl" aria-hidden="true">🔎</div><h3 className="mt-3 text-xl font-black">Nothing matches that yet.</h3><p className="mt-2 text-sm text-[var(--muted)]">Try a different search, category or saved filter.</p><button onClick={() => { setQuery(""); setCategory("All"); setShowSavedOnly(false); }} className="mt-5 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-black text-white">Clear filters</button></div>}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--leaf)]">How it works</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Simple enough to actually use.</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3"><div className="rounded-[26px] border border-[var(--line)] bg-white p-7 shadow-sm"><span className="text-sm font-black text-[var(--leaf)]">01 / LIST</span><h3 className="mt-8 text-xl font-black">Put a useful thing back into circulation.</h3><p className="mt-3 leading-7 text-[var(--muted)]">Add the item, condition, broad area and a useful description. Never publish your address or private contact details.</p></div><div className="rounded-[26px] border border-[var(--line)] bg-white p-7 shadow-sm"><span className="text-sm font-black text-[var(--leaf)]">02 / DISCOVER</span><h3 className="mt-8 text-xl font-black">Find things that solve a real need.</h3><p className="mt-3 leading-7 text-[var(--muted)]">Search by item or category, compare condition and area, then save the ones worth remembering.</p></div><div className="rounded-[26px] border border-[var(--line)] bg-white p-7 shadow-sm"><span className="text-sm font-black text-[var(--leaf)]">03 / HAND OFF</span><h3 className="mt-8 text-xl font-black">Arrange the handoff carefully.</h3><p className="mt-3 leading-7 text-[var(--muted)]">Keep personal information private and use a public, appropriate meeting place with a trusted adult when needed.</p></div></div></section>

      <section id="safety" className="mx-auto max-w-7xl px-5 pb-16 lg:px-8 lg:pb-24"><div className="rounded-[30px] bg-[var(--leaf-dark)] p-8 text-white sm:p-10"><div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex items-center gap-2 text-sm font-bold text-[#e8efd9]"><Icon name="shield" /> Safety is part of the product</div><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight">Good community design protects people, not just items.</h2><p className="mt-4 max-w-2xl leading-7 text-[#dce6d9]">GiveBack intentionally asks for broad areas instead of addresses. Don't publish phone numbers, passwords, school IDs or other sensitive information. For in-person handoffs, choose an appropriate public place and involve a trusted adult when appropriate.</p></div><button onClick={() => flash("Safety reminder: keep private information private.")} className="rounded-full bg-white px-6 py-3 font-black text-[var(--leaf-dark)]">Safety reminder</button></div></div></section>

      <footer className="border-t border-[var(--line)]"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between lg:px-8"><div><strong className="text-[var(--ink)]">GiveBack</strong> · good things, second chances.</div><div className="font-semibold">Created by Koglesh R. Murugan · 2026</div></div></footer>

      {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-5" role="dialog" aria-modal="true" aria-labelledby="item-title" onMouseDown={(event) => event.currentTarget === event.target && setSelected(null)}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[var(--line)] bg-[#fffdf8] p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div className="text-6xl" aria-hidden="true">{selected.emoji}</div><button onClick={() => setSelected(null)} className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] hover:bg-[#f1eee7]" aria-label="Close item details"><Icon name="close" /></button></div><span className="mt-5 inline-flex rounded-full bg-[#e9f0e4] px-3 py-1 text-xs font-black text-[var(--leaf-dark)]">{selected.condition} · {selected.category}</span><h2 id="item-title" className="mt-4 text-2xl font-black tracking-tight">{selected.title}</h2><p className="mt-3 leading-7 text-[var(--muted)]">{selected.note}</p><div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-[#f1ece2] p-4"><b>Area</b><br /><span className="text-[var(--muted)]">{selected.area}</span></div><div className="rounded-2xl bg-[#f1ece2] p-4"><b>Listed</b><br /><span className="text-[var(--muted)]">{formatAge(selected.createdAt)}</span></div></div><div className="mt-5 rounded-2xl border border-[#d7e2cf] bg-[#edf3e8] p-4 text-sm leading-6 text-[var(--leaf-dark)]"><b>Before arranging a handoff:</b> keep your address and private contact information out of public messages. Use an appropriate public location and involve a trusted adult when appropriate.</div><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => toggleSaved(selected.id)} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 py-3 text-sm font-black"><Icon name="heart" /> {saved.includes(selected.id) ? "Saved" : "Save"}</button><button onClick={() => shareItem(selected)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 py-3 text-sm font-black text-white"><Icon name="share" /> Share</button></div></div></div>}

      {showGive && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-5" role="dialog" aria-modal="true" aria-labelledby="give-title" onMouseDown={(event) => event.currentTarget === event.target && setShowGive(false)}><form onSubmit={submitListing} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-[var(--line)] bg-[#fffdf8] p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-[var(--leaf)]">Create a listing</p><h2 id="give-title" className="mt-2 text-2xl font-black">Give something useful.</h2></div><button type="button" onClick={() => setShowGive(false)} className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)]" aria-label="Close listing form"><Icon name="close" /></button></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your listing is saved in this browser. No address or private contact information is needed.</p><div className="mt-6 space-y-4"><label className="block text-sm font-black">Item name<input required minLength={3} maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 font-medium outline-none focus:border-[var(--leaf)]" placeholder="e.g. desk lamp" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-black">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 font-medium">{categories.filter((value): value is Category => value !== "All").map((value) => <option key={value}>{value}</option>)}</select></label><label className="block text-sm font-black">Condition<select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value as Condition })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 font-medium"><option>Like new</option><option>Good</option><option>Fair</option></select></label></div><label className="block text-sm font-black">Broad area<input required minLength={2} maxLength={60} value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 font-medium outline-none focus:border-[var(--leaf)]" placeholder="e.g. Nilai / 3 km away" /><span className="mt-1 block text-xs font-medium text-[var(--muted)]">Do not enter your home address, phone number or other private information.</span></label><label className="block text-sm font-black">Description<textarea required minLength={10} maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[var(--line)] bg-white p-3.5 font-medium outline-none focus:border-[var(--leaf)]" placeholder="Condition details, what is included, or anything a new owner should know..." /></label></div><div className="mt-5 rounded-2xl bg-[#edf3e8] p-4 text-sm leading-6 text-[var(--leaf-dark)]"><b>Privacy check:</b> GiveBack listings should describe the item, not reveal where you live.</div><button type="submit" className="mt-5 w-full rounded-full bg-[var(--leaf)] px-5 py-3.5 font-black text-white transition hover:bg-[var(--leaf-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2">Publish listing</button></form></div>}

      {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[var(--ink)] px-5 py-3 text-center text-sm font-black text-white shadow-xl" role="status" aria-live="polite">{toast}</div>}
    </main>
  );
}
