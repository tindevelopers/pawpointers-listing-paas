"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signUpMember } from "@/app/actions/auth";

const DEFAULT_PROFESSIONS = [
  "Doctor",
  "Dentist",
  "Veterinarian",
  "Groomer",
  "Dog Walker",
  "Therapist",
  "Consultant",
  "Trainer",
  "Nutritionist",
  "Other",
];

export default function MemberSignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    profession: DEFAULT_PROFESSIONS[0],
    customProfession: "",
    businessName: "",
    phoneNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!isChecked) {
      setError("Please agree to the Terms and Conditions");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    const finalProfession = formData.profession === "Other" ? formData.customProfession : formData.profession;
    if (!finalProfession || finalProfession.trim().length < 2) {
      setError("Please select or enter your profession");
      setIsLoading(false);
      return;
    }

    try {
      await signUpMember({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        profession: finalProfession,
        businessName: formData.businessName || undefined,
        phoneNumber: formData.phoneNumber || undefined,
      });

      // Redirect to bookings/listings page after successful signup
      router.push("/bookings");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign up";
      setError(errorMessage);
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up as Service Provider
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Join as a provider to offer services through the platform!
            </p>
          </div>
          <div>
            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <Label>
                    Full Name<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="fullName"
                    name="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    minLength={2}
                  />
                </div>
                {/* Email */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                {/* Password */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Must be at least 8 characters
                  </p>
                </div>
                {/* Confirm Password */}
                <div>
                  <Label>
                    Confirm Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Confirm your password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                    <span
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                {/* Profession */}
                <div>
                  <Label>
                    Profession/Specialty<span className="text-error-500">*</span>
                  </Label>
                  <select
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800"
                  >
                    {DEFAULT_PROFESSIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {formData.profession === "Other" && (
                    <Input
                      type="text"
                      placeholder="Enter your profession"
                      value={formData.customProfession}
                      onChange={(e) => setFormData({ ...formData, customProfession: e.target.value })}
                      className="mt-2"
                      required
                    />
                  )}
                </div>
                {/* Business Name */}
                <div>
                  <Label>
                    Business Name
                  </Label>
                  <Input
                    type="text"
                    id="businessName"
                    name="businessName"
                    placeholder="Enter your business name (optional)"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
                {/* Phone Number */}
                <div>
                  <Label>
                    Phone Number
                  </Label>
                  <Input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="Enter your phone number (optional)"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
                {/* Checkbox */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Terms and Conditions,
                    </span>{" "}
                    and our{" "}
                    <span className="text-gray-800 dark:text-white">
                      Privacy Policy
                    </span>
                  </p>
                </div>
                {/* Button */}
                <div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="sm"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Sign Up as Provider"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start mt-2">
                Looking to book services?{" "}
                <Link
                  href="/signup/user"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign up as a customer
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
