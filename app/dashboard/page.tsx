"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../components/AuthProvider";
import type { Listing } from "@/lib/types";

type Req = {
  id: string;
  listing_id: string;
  requester_id: string;
  message: string;
  status: string;
  created_at: string;
};

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [incoming, setIncoming] = useState<Req[]>([]);
  const [mine, setMine] = useState<Req[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Dashboard data request timed out.")),
            15000
          )
        );

        const request = Promise.all([
          supabase
            .from("listings")
            .select("*")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("requests")
            .select("*")
            .eq("requester_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        const [listingsResult, mineResult] = await Promise.race([
          request,
          timeout,
        ]);

        if (listingsResult.error) {
          throw new Error(
            `Unable to load your listings: ${listingsResult.error.message}`
          );
        }

        if (mineResult.error) {
          throw new Error(
            `Unable to load your requests: ${mineResult.error.message}`
          );
        }

        const ownedListings = (listingsResult.data ?? []) as Listing[];
        const myRequests = (mineResult.data ?? []) as Req[];

        let incomingRequests: Req[] = [];

        const listingIds = ownedListings.map((listing) => listing.id);

        if (listingIds.length > 0) {
          const incomingResult = await Promise.race([
            supabase
              .from("requests")
              .select("*")
              .in("listing_id", listingIds)
              .order("created_at", { ascending: false }),

            timeout,
          ]);

          if (incomingResult.error) {
            throw new Error(
              `Unable to load incoming requests: ${incomingResult.error.message}`
            );
          }

          incomingRequests = (incomingResult.data ?? []) as Req[];
        }

        if (!active) return;

        setListings(ownedListings);
        setMine(myRequests);
        setIncoming(incomingRequests);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading your dashboard."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [user, authLoading, router]);

  async function accept(id: string) {
    setError("");

    const { error } = await createClient().rpc("accept_request", {
      p_request_id: id,
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
    window.location.reload();
  }

  async function decline(id: string) {
    setError("");

    const { error } = await createClient()
      .from("requests")
      .update({ status: "declined" })
      .eq("id", id)
      .eq("status", "pending");

    if (error) {
      setError(error.message);
      return;
    }

    window.location.reload();
  }

  async function cancel(id: string) {
    if (!user) return;

    setError("");

    const { error } = await createClient()
      .from("requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("requester_id", user.id)
      .eq("status", "pending");

    if (error) {
      setError(error.message);
      return;
    }

    window.location.reload();
  }

  if (authLoading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16">
        <div className="card p-8">
          <p className="font-bold">Checking your account…</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Securely restoring your GiveBack session.
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16">
        <div className="card p-8">
          <p className="font-bold">Redirecting to login…</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16">
        <div className="card p-8">
          <p className="font-bold">Loading your dashboard…</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Loading your listings and requests.
          </p>
        </div>
      </main>
    );
  }

  const displayedError = error || authError;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-4xl font-black">Your dashboard</h1>

      <p className="mt-2 text-[var(--muted)]">
        Manage your giveaways and real requests.
      </p>

      {displayedError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <b>We couldn't load everything.</b>
          <p className="mt-1 text-sm">{displayedError}</p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-2xl font-black">Your listings</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {listings.length ? (
            listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="card p-5 transition hover:-translate-y-0.5"
              >
                <b>{listing.title}</b>

                <p className="mt-2 text-sm text-[var(--muted)]">
                  {listing.status} · {listing.city}, {listing.country}
                </p>
              </Link>
            ))
          ) : (
            <div className="card p-6 md:col-span-3">
              You haven't given anything away yet.
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-black">Incoming requests</h2>

        <div className="mt-4 space-y-3">
          {incoming.length ? (
            incoming.map((request) => (
              <div
                key={request.id}
                className="card flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <b>Request for your item</b>

                  <p className="text-sm text-[var(--muted)]">
                    {request.message}
                  </p>

                  <small>{request.status}</small>
                </div>

                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => accept(request.id)}
                      className="rounded-xl bg-[var(--leaf)] px-4 py-2 font-bold text-white"
                    >
                      Accept
                    </button>

                    <button
                      onClick={() => decline(request.id)}
                      className="rounded-xl border px-4 py-2 font-bold"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="card p-6">No incoming requests yet.</div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-black">My requests</h2>

        <div className="mt-4 space-y-3">
          {mine.length ? (
            mine.map((request) => (
              <div
                key={request.id}
                className="card flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <b>Giveaway request</b>

                  <p className="text-sm text-[var(--muted)]">
                    {request.message}
                  </p>

                  <small>{request.status}</small>
                </div>

                {request.status === "pending" && (
                  <button
                    onClick={() => cancel(request.id)}
                    className="rounded-xl border px-4 py-2 font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="card p-6">
              You haven't requested anything yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
