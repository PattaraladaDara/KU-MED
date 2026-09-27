import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Confirms both connectivity and the initial migration, rather than TCP alone.
    const project = await getDb().applicationMetadata.findUnique({
      where: { key: "project" },
    });
    if (project?.value !== "KU-MED") throw new Error("Database not initialized");
    return NextResponse.json(
      { status: "ok", database: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", database: "not_ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
