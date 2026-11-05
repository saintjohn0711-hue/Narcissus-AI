import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

function createAuth() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    // Build-time / no-DB: export a stub that throws on use
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: url,
    // Neon + serverless: prefer short-lived connections
    max: 1,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema });

  const baseURL =
    process.env.BETTER_AUTH_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      "https://narcissus-ai.vercel.app",
      "https://narcissus-ai-player18.vercel.app",
      "http://localhost:3000",
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        adultsConfirmed: {
          type: "boolean",
          required: true,
          defaultValue: false,
          input: true,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!user.adultsConfirmed) {
              throw new APIError("BAD_REQUEST", {
                message: "You must confirm you are 18+ to create an account.",
              });
            }
            return { data: user };
          },
        },
      },
    },
    session: {
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [nextCookies()],
  });
}

let _auth: ReturnType<typeof createAuth> | null = null;

/** Lazy Better Auth instance — safe when DATABASE_URL missing at build. */
export function getAuth() {
  if (!_auth) _auth = createAuth();
  return _auth;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.BETTER_AUTH_SECRET?.trim());
}
