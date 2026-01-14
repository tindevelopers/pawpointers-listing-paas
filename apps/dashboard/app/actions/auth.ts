"use server";

import { signIn as coreSignIn, signOut as coreSignOut, signUp as coreSignUp, type SignUpData } from "@/core/auth/actions";

export async function signIn(data: { email: string; password: string }) {
  return coreSignIn(data);
}

export async function signOut() {
  return coreSignOut();
}

export async function signUp(data: SignUpData) {
  return coreSignUp(data);
}

