import "server-only";

import { cookies } from "next/headers";
import { verifyImpersonationToken, type ImpersonationTokenPayload } from "@tinadmin/core";

export async function getImpersonationContext(): Promise<ImpersonationTokenPayload | null> {
  const token = (await cookies()).get("pp_impersonation")?.value;
  if (!token) return null;
  const secret = process.env.IMPERSONATION_JWT_SECRET;
  if (!secret) return null;
  const verified = verifyImpersonationToken(token, secret);
  return verified.valid ? verified.payload : null;
}

