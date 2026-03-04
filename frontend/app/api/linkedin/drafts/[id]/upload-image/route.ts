import { NextRequest } from "next/server";

const BACKEND_URL = process.env.LINKEDIN_BACKEND_URL || "http://127.0.0.1:8200";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Forward multipart form data directly — do not read as text or set Content-Type manually
  const formData = await request.formData();
  const resp = await fetch(`${BACKEND_URL}/drafts/${id}/upload-image`, {
    method: "POST",
    body: formData,
    // Let fetch set the Content-Type with the correct multipart boundary
  });

  const data = await resp.text();
  return new Response(data, {
    status: resp.status,
    headers: { "Content-Type": "application/json" },
  });
}
