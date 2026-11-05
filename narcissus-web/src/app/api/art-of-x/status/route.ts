import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isDatabaseConfigured } from "@/db";
import { getAuth, isAuthConfigured } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const database = isDatabaseConfigured();
  const authConfigured = isAuthConfigured();
  let signedIn = false;
  let userId: string | null = null;

  if (authConfigured) {
    try {
      const session = await getAuth().api.getSession({
        headers: await headers(),
      });
      signedIn = Boolean(session?.user?.id);
      userId = session?.user?.id ?? null;
    } catch {
      signedIn = false;
    }
  }

  return NextResponse.json({
    database,
    auth: authConfigured,
    signedIn,
    userId,
    /** Cloud save requires DB + signed-in session */
    cloud: database && signedIn,
  });
}
