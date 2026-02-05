import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set([
  "/signin",
  "/admin/create-platform-admin",
  "/admin/check-platform-admin",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow next internals + public assets + all API routes (API routes handle their own auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Prefer Staff Supabase for admin portal auth if configured
  const staffUrl = process.env.NEXT_PUBLIC_STAFF_SUPABASE_URL?.trim();
  const staffAnon = process.env.NEXT_PUBLIC_STAFF_SUPABASE_ANON_KEY?.trim();

  // If auth isn’t configured, don’t block routing (prevents infinite redirects during misconfig)
  if ((!staffUrl || !staffAnon) && (!supabaseUrl || !supabaseAnonKey)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const authUrl = staffUrl && staffAnon ? staffUrl : (supabaseUrl as string);
  const authAnon = staffUrl && staffAnon ? staffAnon : (supabaseAnonKey as string);

  const supabase = createServerClient(authUrl, authAnon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

