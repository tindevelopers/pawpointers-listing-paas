import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function isStaffAuthEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_STAFF_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_STAFF_SUPABASE_ANON_KEY
  );
}

export async function createStaffClient() {
  if (!isStaffAuthEnabled()) {
    throw new Error("Staff Supabase is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_STAFF_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_STAFF_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

function isSystemAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowList = process.env.STAFF_ADMIN_EMAILS?.split(",").map((e) => e.trim());
  if (!allowList?.length) {
    return true;
  }
  return allowList.includes(email);
}

export async function requireSystemAdmin() {
  const staff = await createStaffClient();
  const { data: { user } } = await staff.auth.getUser();

  if (!user || !user.email) {
    throw new Error("Staff user not authenticated.");
  }

  const role =
    (user.app_metadata as { role?: string } | null)?.role ??
    (user.user_metadata as { role?: string } | null)?.role;

  if (role && ["system_admin", "System Admin"].includes(role)) {
    return user;
  }

  if (isSystemAdminEmail(user.email)) {
    return user;
  }

  throw new Error("Staff user is not authorized.");
}
