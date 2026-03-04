import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.LINKEDIN_BACKEND_URL || "http://127.0.0.1:8200";

export async function GET(request: NextRequest) {
  // Redirect to the backend OAuth start endpoint which handles the LinkedIn redirect
  return NextResponse.redirect(`${BACKEND_URL}/auth/linkedin/start`);
}
