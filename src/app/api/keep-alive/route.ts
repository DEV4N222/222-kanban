import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron (see vercel.json). Supabase pauses
// free-plan projects after about a week without activity, which locks
// everyone out; a tiny daily query keeps the project awake.
//
// If CRON_SECRET is set in Vercel, Vercel sends it as a bearer token and
// other callers are refused. The query returns no data either way.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // Reaches the database; row-level security means nothing is returned.
  const { error } = await supabase.from("boards").select("id").limit(1);
  if (error) {
    console.error("[keep-alive] Supabase query failed", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
