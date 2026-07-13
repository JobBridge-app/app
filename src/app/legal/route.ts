import { NextResponse } from "next/server";

export function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? request.url;
  return NextResponse.redirect(new URL("/legal/impressum", baseUrl), 307);
}
