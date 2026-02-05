import { NextRequest, NextResponse } from "next/server";
import { verifyImpersonationToken } from "@tinadmin/core";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const secret = process.env.IMPERSONATION_JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: { code: "CONFIG_ERROR", message: "IMPERSONATION_JWT_SECRET is not set" } },
      { status: 500 }
    );
  }

  const verified = verifyImpersonationToken(token, secret);
  if (!verified.valid) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_TOKEN", message: verified.error } },
      { status: 401 }
    );
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("pp_impersonation", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, verified.payload.exp - Math.floor(Date.now() / 1000)),
  });
  return res;
}

