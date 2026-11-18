import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isDatabaseConfigured } from "@/db";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { musePhotoLimitsForAccount } from "@/lib/musePhotoLimits";

export const runtime = "nodejs";

export async function GET() {
  const database = isDatabaseConfigured();
  const authConfigured = isAuthConfigured();
  let signedIn = false;
  let userId: string | null = null;
  let email: string | null = null;
  let sessionCheckFailed = false;

  if (authConfigured) {
    try {
      const session = await getAuth().api.getSession({
        headers: await headers(),
      });
      signedIn = Boolean(session?.user?.id);
      userId = session?.user?.id ?? null;
      email =
        typeof session?.user?.email === "string" ? session.user.email : null;
    } catch {
      // Neon / auth blip — do not claim the user is signed out.
      sessionCheckFailed = true;
      signedIn = false;
    }
  }

  const photoLimits = musePhotoLimitsForAccount({ email, signedIn });

  return NextResponse.json({
    database,
    auth: authConfigured,
    signedIn,
    sessionCheckFailed,
    userId,
    /** Cloud save requires DB + positively confirmed signed-in session */
    cloud: database && signedIn && !sessionCheckFailed,
    /** Muse photo caps for this account tier */
    photoLimits: {
      tier: photoLimits.tier,
      label: photoLimits.label,
      perPartner: photoLimits.perPartner,
      accountTotal: photoLimits.accountTotal,
    },
  });
}
