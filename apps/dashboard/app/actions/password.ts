"use server";

import { createClient } from "@/core/database/server";

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: "Not authenticated" };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: "Current password is incorrect" };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update password",
    };
  }
}
