"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpMember } from "@/app/actions/auth";

// Business categories with emojis (matching homepage design)
const BUSINESS_CATEGORIES = [
  {
    id: "pet-care-services",
    name: "Pet Care Services",
    emoji: "🐾",
    subcategories: ["Dog Walking", "Pet Sitting", "Pet Boarding", "Daycare"],
  },
  {
    id: "health-wellness",
    name: "Health and Wellness",
    emoji: "❤️",
    subcategories: ["Veterinarian", "Grooming", "Spa & Massage", "Nutrition"],
  },
  {
    id: "training-behavior",
    name: "Training and Behavior",
    emoji: "🎯",
    subcategories: ["Dog Training", "Behavior Consulting", "Obedience Classes", "Puppy Training"],
  },
  {
    id: "pet-retail",
    name: "Pet Retail",
    emoji: "🛍️",
    subcategories: ["Pet Supplies", "Food & Nutrition", "Toys & Accessories", "Pet Fashion"],
  },
  {
    id: "specialist-services",
    name: "Specialist Pet Services",
    emoji: "⭐",
    subcategories: ["Photography", "Taxi/Transportation", "Training Facility", "Boarding Facility"],
  },
  {
    id: "rescue-community",
    name: "Rescue & Community",
    emoji: "🤝",
    subcategories: ["Rescue Organization", "Foster Network", "Adoption Services", "Community Support"],
  },
  {
    id: "events-experiences",
    name: "Events & Experiences",
    emoji: "🎉",
    subcategories: ["Pet Classes", "Workshops", "Social Events", "Parties & Celebrations"],
  },
];

const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Your Platform";

type FormStep = 1 | 2 | 3;

interface FormData {
  // Step 1
  fullName: string;
  businessName: string;
  email: string;
  phoneNumber: string;
  address: string;
  // Step 2
  businessCategory: string;
  businessSubcategory: string;
  // Step 3
  website: string;
  socialMediaLinks: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  password: string;
  confirmPassword: string;
}

export default function MemberSignupForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    businessName: "",
    email: "",
    phoneNumber: "",
    address: "",
    businessCategory: "",
    businessSubcategory: "",
    website: "",
    socialMediaLinks: {},
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCategory = BUSINESS_CATEGORIES.find(
    (cat) => cat.id === formData.businessCategory
  );

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialMediaLinks: {
        ...prev.socialMediaLinks,
        [platform]: value,
      },
    }));
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (formData.fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters");
      return false;
    }
    if (!formData.businessName.trim()) {
      setError("Business name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email");
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (!formData.address.trim()) {
      setError("Address is required");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.businessCategory) {
      setError("Please select a business category");
      return false;
    }
    if (!formData.businessSubcategory) {
      setError("Please select a subcategory");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (!formData.confirmPassword) {
      setError("Please confirm your password");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as FormStep);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateStep3()) {
      return;
    }

    startTransition(async () => {
      try {
        // Construct the profession from category and subcategory
        const profession = `${selectedCategory?.name} - ${formData.businessSubcategory}`;

        await signUpMember({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          profession: profession,
          businessName: formData.businessName || undefined,
          phoneNumber: formData.phoneNumber || undefined,
        });
        router.push("/bookings");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to sign up";
        setError(message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex-1 flex items-center">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                step <= currentStep
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`h-1 flex-1 mx-2 transition-colors ${
                  step < currentStep
                    ? "bg-blue-600"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Titles */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {currentStep === 1 && "Basic Information"}
          {currentStep === 2 && "Business Category"}
          {currentStep === 3 && "Password & Social Links"}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {currentStep === 1 && "Tell us about yourself and your business"}
          {currentStep === 2 && "Select your business category and specialty"}
          {currentStep === 3 && "Set your password and add social media links"}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label
              htmlFor="businessName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              id="businessName"
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => handleInputChange("businessName", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your Business Name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phoneNumber"
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Address <span className="text-red-500">*</span>
            </label>
            <input
              id="address"
              type="text"
              required
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St, City, State ZIP"
            />
          </div>
        </div>
      )}

      {/* Step 2: Business Category */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="businessCategory"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
            >
              Business Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUSINESS_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    handleInputChange("businessCategory", category.id);
                    handleInputChange("businessSubcategory", "");
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.businessCategory === category.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700"
                  }`}
                >
                  <div className="text-2xl mb-2">{category.emoji}</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedCategory && (
            <div>
              <label
                htmlFor="businessSubcategory"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Specialty <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {selectedCategory.subcategories.map((subcat) => (
                  <label
                    key={subcat}
                    className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <input
                      type="radio"
                      name="businessSubcategory"
                      value={subcat}
                      checked={formData.businessSubcategory === subcat}
                      onChange={(e) =>
                        handleInputChange("businessSubcategory", e.target.value)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-900 dark:text-white font-medium">
                      {subcat}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Password & Social Links */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 8 characters
              </p>
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Social Media Links <span className="text-gray-500 text-sm font-normal">(Optional)</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="instagram"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Instagram
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 dark:text-gray-400 mr-3">@</span>
                  <input
                    id="instagram"
                    type="text"
                    value={formData.socialMediaLinks.instagram || ""}
                    onChange={(e) =>
                      handleSocialMediaChange("instagram", e.target.value)
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your_username"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="facebook"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Facebook
                </label>
                <input
                  id="facebook"
                  type="text"
                  value={formData.socialMediaLinks.facebook || ""}
                  onChange={(e) =>
                    handleSocialMediaChange("facebook", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="facebook.com/yourpage"
                />
              </div>

              <div>
                <label
                  htmlFor="twitter"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Twitter/X
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 dark:text-gray-400 mr-3">@</span>
                  <input
                    id="twitter"
                    type="text"
                    value={formData.socialMediaLinks.twitter || ""}
                    onChange={(e) =>
                      handleSocialMediaChange("twitter", e.target.value)
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your_handle"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="linkedin"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  LinkedIn
                </label>
                <input
                  id="linkedin"
                  type="text"
                  value={formData.socialMediaLinks.linkedin || ""}
                  onChange={(e) =>
                    handleSocialMediaChange("linkedin", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="linkedin.com/in/yourprofile"
                />
              </div>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start space-x-3 border-t border-gray-200 dark:border-gray-700 pt-6">
            <input
              id="terms"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label
              htmlFor="terms"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Privacy Policy
              </Link>
            </label>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-6">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Back
          </button>
        )}
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isPending ? "Creating account..." : "Create Provider Account"}
          </button>
        )}
      </div>

      {/* Sign In Link */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="text-blue-600 hover:text-blue-500 font-medium dark:text-blue-400"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
