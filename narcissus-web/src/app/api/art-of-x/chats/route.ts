import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { ownerKey } from "@/lib/ownerKey";
import type { ChatMessage } from "@/lib/artOfX";

export const runtime = "nodejs";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.ownerKey, ownerKey()));

  const chats: Record<string, ChatMessage[]> = {};
  for (const row of rows) {
    const key = String(row.partnerId);
    if (!chats[key]) chats[key] = [];
    chats[key].push({
      id: row.id,
      partnerId: row.partnerId,
      who: row.who as ChatMessage["who"],
      text: row.text,
      at: row.at.toISOString(),
    });
  }
  for (const k of Object.keys(chats)) {
    chats[k].sort((a, b) => a.at.localeCompare(b.at));
  }
  return NextResponse.json({ chats });
}

export async function PUT(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  let body: { chats?: Record<string, ChatMessage[]> };
  try {
    body = (await req.json()) as { chats?: Record<string, ChatMessage[]> };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const map = body.chats && typeof body.chats === "object" ? body.chats : {};
  const db = getDb();
  const key = ownerKey();

  await db
    .delete(schema.chatMessages)
    .where(eq(schema.chatMessages.ownerKey, key));

  for (const [partnerKey, messages] of Object.entries(map)) {
    const partnerId = Number(partnerKey);
    if (!Number.isFinite(partnerId)) continue;
    for (const m of messages || []) {
      await db.insert(schema.chatMessages).values({
        id: m.id,
        ownerKey: key,
        partnerId,
        who: m.who,
        text: m.text,
        at: m.at ? new Date(m.at) : new Date(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
