import { headers } from "next/headers";
import { getAuth, isAuthConfigured } from "@/lib/auth";

export async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  const session = await requireUserSession();
  if (!session.ok) return session;
  return { ok: true, userId: session.userId };
}

/** Signed-in session with email (for account-tier photo caps). */
export async function requireUserSession(): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: number; error: string }
> {
  if (!isAuthConfigured()) {
    return { ok: false, status: 503, error: "auth_not_configured" };
  }
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return { ok: false, status: 401, error: "unauthorized" };
    }
    const email =
      typeof session.user.email === "string" ? session.user.email : null;
    return { ok: true, userId: session.user.id, email };
  } catch {
    // Transient DB / auth blips are not sign-outs — avoid 401 so the client
    // does not clear cloud mode and bounce the user to “Log in”.
    return { ok: false, status: 503, error: "session_check_failed" };
  }
}
