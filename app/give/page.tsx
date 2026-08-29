"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../components/AuthProvider";
import type { ListingCategory, ListingCondition } from "@/lib/types";

const CATEGORIES: ListingCategory[] = [
  "Books",
  "School",
  "Clothing",
  "Home",
  "Electronics",
  "Sports",
  "Toys & Games",
  "Other",
];

const CONDITIONS: Array<{ value: ListingCondition; label: string }> = [
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "new", label: "New" },
];

type FieldErrors = Partial<
  Record<
    "title" | "description" | "category" | "condition" | "city" | "country",
    string
  >
>;

const fieldClass =
  "mt-2 w-full rounded-2xl border border-[var(--line)] bg-white p-3.5 font-medium outline-none transition focus:border-[var(--leaf)] focus:ring-2 focus:ring-[#dfe9d7] disabled:opacity-60";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

export default function GivePage() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategory>("Books");
  const [condition, setCondition] = useState<ListingCondition>("good");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/give");
    }
  }, [authLoading, user, router]);

  const disabled = submitting || authLoading || !user;

  const loginHref = useMemo(() => "/login?next=/give", []);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedCity = city.trim();
    const trimmedCountry = country.trim();

    if (trimmedTitle.length < 3 || trimmedTitle.length > 80) {
      next.title = "Item title must be 3–80 characters.";
    }

    if (trimmedDescription.length < 10 || trimmedDescription.length > 500) {
      next.description = "Description must be 10–500 characters.";
    }

    if (!CATEGORIES.includes(category)) {
      next.category = "Please choose a category.";
    }

    if (!CONDITIONS.some((option) => option.value === condition)) {
      next.condition = "Please choose a condition.";
    }

    if (trimmedCity.length < 2 || trimmedCity.length > 60) {
      next.city = "Enter a city or broad area (2–60 characters), not a home address.";
    }

    if (trimmedCountry.length < 2 || trimmedCountry.length > 60) {
      next.country = "Enter a country (2–60 characters).";
    }

    return next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setFormError("");
    const nextErrors = validate();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!user) {
      router.replace(loginHref);
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("listings")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          condition,
          city: city.trim(),
          country: country.trim(),
          pickup_notes: pickupNotes.trim() ? pickupNotes.trim() : null,
        })
        .select("id")
        .single();

      if (error) {
        setFormError(error.message);
        return;
      }

      if (!data?.id) {
        setFormError("The listing was created, but we could not open it. Check your dashboard.");
        return;
      }

      if (!isSafeInternalPath(`/listing/${data.id}`)) {
        setFormError("The listing was created, but the destination was invalid.");
        return;
      }

      window.location.assign(`/listing/${encodeURIComponent(data.id)}`);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Something went wrong while publishing your listing.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen px-5 py-16">
        <div className="mx-auto max-w-xl rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-sm">
          <p className="font-black">Checking your account…</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            You need to be signed in before you can give an item.
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen px-5 py-16">
        <div className="mx-auto max-w-xl rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-8 shadow-sm">
          <p className="font-black">Redirecting to login…</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            GiveBack listings are tied to a real account.
          </p>
          <Link
            href={loginHref}
            className="mt-6 inline-flex rounded-full bg-[var(--leaf)] px-5 py-2.5 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2"
          >
            Continue to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#f8f6f0]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3" aria-label="GiveBack home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ink)] text-white shadow-sm">
              <span className="text-lg font-black">GB</span>
            </span>
            <span>
              <strong className="block text-lg tracking-tight">GiveBack</strong>
              <span className="text-xs font-medium text-[var(--muted)]">
                good things, second chances
              </span>
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="text-sm font-black transition hover:text-[var(--leaf)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-5 py-12 lg:py-16">
        <div className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-[#dfe8d5] blur-3xl" />

        <p className="text-xs font-black uppercase tracking-[.15em] text-[var(--leaf)]">
          Create a listing
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          Give something useful.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Describe the item, its condition, and a broad area. Do not publish a
          home address, phone number, school ID, or other private contact details.
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          className="relative mt-8 rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-6 shadow-sm sm:p-8"
          aria-describedby={formError || authError ? "give-form-error" : undefined}
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-black">
                Item title
              </label>
              <input
                id="title"
                name="title"
                required
                minLength={3}
                maxLength={80}
                value={title}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? "title-error" : "title-hint"}
                onChange={(event) => setTitle(event.target.value)}
                className={fieldClass}
                placeholder="e.g. desk lamp"
              />
              <p id="title-hint" className="mt-1 text-xs font-medium text-[var(--muted)]">
                3–80 characters.
              </p>
              {fieldErrors.title && (
                <p id="title-error" className="mt-1 text-sm font-medium text-red-700" role="alert">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-black">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                minLength={10}
                maxLength={500}
                value={description}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={
                  fieldErrors.description ? "description-error" : "description-hint"
                }
                onChange={(event) => setDescription(event.target.value)}
                className={`${fieldClass} min-h-32 resize-y`}
                placeholder="Condition details, what is included, or anything a new owner should know..."
              />
              <p id="description-hint" className="mt-1 text-xs font-medium text-[var(--muted)]">
                10–500 characters. Keep private details out of the listing.
              </p>
              {fieldErrors.description && (
                <p
                  id="description-error"
                  className="mt-1 text-sm font-medium text-red-700"
                  role="alert"
                >
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="block text-sm font-black">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={category}
                  disabled={disabled}
                  aria-invalid={Boolean(fieldErrors.category)}
                  onChange={(event) =>
                    setCategory(event.target.value as ListingCategory)
                  }
                  className={fieldClass}
                >
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <p className="mt-1 text-sm font-medium text-red-700" role="alert">
                    {fieldErrors.category}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="condition" className="block text-sm font-black">
                  Condition
                </label>
                <select
                  id="condition"
                  name="condition"
                  value={condition}
                  disabled={disabled}
                  aria-invalid={Boolean(fieldErrors.condition)}
                  aria-describedby="condition-hint"
                  onChange={(event) =>
                    setCondition(event.target.value as ListingCondition)
                  }
                  className={fieldClass}
                >
                  {CONDITIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p id="condition-hint" className="mt-1 text-xs font-medium text-[var(--muted)]">
                  Be honest. If something needs repair, describe that in the listing.
                </p>
                {fieldErrors.condition && (
                  <p className="mt-1 text-sm font-medium text-red-700" role="alert">
                    {fieldErrors.condition}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="block text-sm font-black">
                  City / broad area
                </label>
                <input
                  id="city"
                  name="city"
                  required
                  minLength={2}
                  maxLength={60}
                  value={city}
                  disabled={disabled}
                  autoComplete="address-level2"
                  aria-invalid={Boolean(fieldErrors.city)}
                  aria-describedby={fieldErrors.city ? "city-error" : "city-hint"}
                  onChange={(event) => setCity(event.target.value)}
                  className={fieldClass}
                  placeholder="e.g. your town / neighbourhood"
                />
                <p id="city-hint" className="mt-1 text-xs font-medium text-[var(--muted)]">
                  Do not enter a home address.
                </p>
                {fieldErrors.city && (
                  <p id="city-error" className="mt-1 text-sm font-medium text-red-700" role="alert">
                    {fieldErrors.city}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-black">
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  required
                  minLength={2}
                  maxLength={60}
                  value={country}
                  disabled={disabled}
                  autoComplete="country-name"
                  aria-invalid={Boolean(fieldErrors.country)}
                  aria-describedby={fieldErrors.country ? "country-error" : undefined}
                  onChange={(event) => setCountry(event.target.value)}
                  className={fieldClass}
                  placeholder="e.g. Malaysia"
                />
                {fieldErrors.country && (
                  <p
                    id="country-error"
                    className="mt-1 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {fieldErrors.country}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="pickup_notes" className="block text-sm font-black">
                Pickup / handoff notes{" "}
                <span className="font-medium text-[var(--muted)]">(optional)</span>
              </label>
              <textarea
                id="pickup_notes"
                name="pickup_notes"
                maxLength={400}
                value={pickupNotes}
                disabled={disabled}
                aria-describedby="pickup-hint"
                onChange={(event) => setPickupNotes(event.target.value)}
                className={`${fieldClass} min-h-24 resize-y`}
                placeholder="e.g. weekday evenings, public library area"
              />
              <p id="pickup-hint" className="mt-1 text-xs font-medium text-[var(--muted)]">
                Suggest a public meeting area if you like. Never include a phone
                number, password, or exact home address.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[#edf3e8] p-4 text-sm leading-6 text-[var(--leaf-dark)]">
            <b>Privacy check:</b> GiveBack listings should describe the item, not
            reveal where you live.
          </div>

          {(formError || authError) && (
            <p
              id="give-form-error"
              className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700"
              role="alert"
            >
              {formError || authError}
            </p>
          )}

          <button
            type="submit"
            disabled={disabled}
            className="mt-5 w-full rounded-full bg-[var(--leaf)] px-5 py-3.5 font-black text-white transition hover:bg-[var(--leaf-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--leaf)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Publishing listing…" : "Publish listing"}
          </button>
        </form>
      </div>
    </main>
  );
}
