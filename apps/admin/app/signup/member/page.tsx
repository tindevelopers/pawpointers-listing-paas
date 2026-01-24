import MemberSignupForm from "@/components/auth/MemberSignupForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up as Service Provider | SaaS Admin",
  description: "Create your service provider account",
};

export default function MemberSignUpPage() {
  return <MemberSignupForm />;
}

