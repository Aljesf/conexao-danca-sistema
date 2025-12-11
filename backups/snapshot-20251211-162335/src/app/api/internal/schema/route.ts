import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const SNAPSHOT_FILE = path.join(process.cwd(), "docs", "schema-snapshot.json");

export async function GET() {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, "utf-8");
    const data = JSON.parse(raw);

    return NextResponse.json(
      {
        ok: true,
        schema: data,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    return NextResponse.json(
      {
        ok: false,
        error: "SCHEMA_SNAPSHOT_NOT_AVAILABLE",
        detail: err.message,
      },
      { status: 500 }
    );
  }
}
