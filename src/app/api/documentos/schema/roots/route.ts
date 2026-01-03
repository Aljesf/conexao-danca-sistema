import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: [{ key: "matriculas", label: "Matriculas (root: matriculas.id)", pk: "id" }],
  });
}
