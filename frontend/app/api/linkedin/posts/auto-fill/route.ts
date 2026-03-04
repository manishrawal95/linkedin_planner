import { proxyToBackend } from "@/lib/api";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return proxyToBackend("/posts/auto-fill", request);
}
