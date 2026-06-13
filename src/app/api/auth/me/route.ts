import { NextRequest } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getTokenFromRequest(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(user);
}

export async function DELETE() {
  const res = Response.json({ ok: true });
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0");
  return new Response(res.body, { status: 200, headers });
}
