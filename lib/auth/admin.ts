import crypto from "crypto";
import { cookies } from "next/headers";
import { dbQuery, isDatabaseConfigured } from "@/lib/db/postgres";

const ADMIN_COOKIE_NAME = "mulone_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  email: string;
  exp: number;
};

type AdminUserRow = {
  id?: number;
  email: string;
  password_hash: string;
  is_active: boolean;
};

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (secret.length < 16) {
    return null;
  }
  return secret;
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function encode(payload: SessionPayload, secret: string) {
  const base = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(base, secret);
  return `${base}.${signature}`;
}

function decode(token: string, secret: string): SessionPayload | null {
  const [base, signature] = token.split(".");
  if (!base || !signature) {
    return null;
  }

  const expected = signPayload(base, secret);
  if (!safeEqual(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(base, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload.email || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, digest] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !digest) {
    return false;
  }
  const calculated = crypto.scryptSync(password, salt, 64).toString("hex");
  return safeEqual(calculated, digest);
}

export async function isAdminAuthConfigured() {
  if (!isDatabaseConfigured() || !getSessionSecret()) {
    return false;
  }

  try {
    const result = await dbQuery<{ id: number }>(
      "select id from admin_users where is_active = true limit 1"
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function createAdminSession(email: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("ADMIN_AUTH_NOT_CONFIGURED");
  }

  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, encode(payload, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

export async function getAdminSession() {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const payload = decode(token, secret);
  if (!payload) {
    return null;
  }

  if (isDatabaseConfigured()) {
    try {
      const userResult = await dbQuery<Pick<AdminUserRow, "email" | "is_active">>(
        "select email, is_active from admin_users where lower(email) = $1 limit 1",
        [payload.email.toLowerCase()]
      );
      const user = userResult.rows[0];
      if (!user || !user.is_active) {
        const store = await cookies();
        store.delete(ADMIN_COOKIE_NAME);
        return null;
      }
    } catch {
      return null;
    }
  }

  return {
    email: payload.email,
  };
}

export async function validateAdminCredentials(email: string, password: string) {
  if (!isDatabaseConfigured()) {
    return false;
  }

  try {
    const result = await dbQuery<AdminUserRow>(
      `select email, password_hash, is_active
       from admin_users
       where lower(email) = $1
       limit 1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return false;
    }

    const validPassword = verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return false;
    }

    await dbQuery("update admin_users set last_login_at = now(), updated_at = now() where lower(email) = $1", [
      user.email.toLowerCase(),
    ]);
    return true;
  } catch {
    return false;
  }
}
