import { createClient } from "@supabase/supabase-js";
import type { CityProfile } from "@/lib/game/types";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function userId(): Promise<string | null> {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  const { auth } = await import("@clerk/nextjs/server");
  const session = await auth();
  return session.userId;
}

function asProfile(row: {
  cash: number;
  energy: number;
  employed: boolean;
  businesses: string[] | null;
  vehicles: string[] | null;
}): CityProfile {
  return {
    cash: row.cash,
    energy: row.energy,
    employed: row.employed,
    businesses: row.businesses ?? [],
    vehicles: row.vehicles ?? [],
  };
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ profile: null }, { status: 401 });
  const db = database();
  if (!db) return Response.json({ profile: null, reason: "missing_supabase" }, { status: 503 });
  const { data, error } = await db
    .from("profiles")
    .select("cash, energy, employed, businesses, vehicles")
    .eq("id", id)
    .maybeSingle();
  if (error) return Response.json({ profile: null, reason: "read_failed" }, { status: 200 });
  return Response.json({ profile: data ? asProfile(data) : null });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const db = database();
  if (!db) return Response.json({ ok: false, reason: "missing_supabase" }, { status: 503 });

  const body = (await request.json()) as Partial<CityProfile>;
  const cash = Number(body.cash);
  const energy = Number(body.energy);
  if (!Number.isFinite(cash) || !Number.isFinite(energy)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const businesses = Array.isArray(body.businesses) ? body.businesses.filter((item) => typeof item === "string") : [];
  const vehicles = Array.isArray(body.vehicles) ? body.vehicles.filter((item) => typeof item === "string") : [];
  const { error } = await db.from("profiles").upsert({
    id,
    cash: Math.max(0, Math.floor(cash)),
    energy: Math.max(0, Math.min(100, Math.floor(energy))),
    employed: Boolean(body.employed),
    businesses,
    vehicles,
    updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ ok: false, reason: "write_failed" }, { status: 200 });
  return Response.json({ ok: true });
}
