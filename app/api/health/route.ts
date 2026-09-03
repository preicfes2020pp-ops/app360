import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", app: "AULA360", fase: 0 });
}
