import { headers } from "next/headers";
import { getAuth, isAuthConfigured } from "@/lib/auth";

export async function requireUserId(): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
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
    return { ok: true, userId: session.user.id };
  } catch {
    return { ok: false, status: 401, error: "unauthorized" };
  }
}
