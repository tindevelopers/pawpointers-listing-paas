import UserSignupForm from "@/components/auth/UserSignupForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up as Customer | SaaS Admin",
  description: "Create your customer account",
};

export default function UserSignUpPage() {
  return <UserSignupForm />;
}

