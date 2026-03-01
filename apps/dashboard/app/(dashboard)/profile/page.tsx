"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserCircleIcon,
  KeyIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { updatePassword } from "@/app/actions/password";

type TabType = "profile" | "account" | "password";

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || "profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tabFromUrl && ["profile", "account", "password"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage(null);
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      setIsSubmitting(false);
      return;
    }

    const result = await updatePassword(currentPassword, newPassword);
    if (result.success) {
      setPasswordMessage({ type: "success", text: "Password updated successfully" });
      form.reset();
    } else {
      setPasswordMessage({ type: "error", text: result.error || "Failed to update password" });
    }
    setIsSubmitting(false);
  }

  const tabs = [
    { id: "profile" as const, label: "Edit Profile", icon: UserCircleIcon },
    { id: "account" as const, label: "Account Settings", icon: Cog6ToothIcon },
    { id: "password" as const, label: "Change Password", icon: KeyIcon },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-8 text-white">
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-wide text-white/80">
            <UserCircleIcon className="h-4 w-4" />
            User Profile
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Account Settings</h1>
          <p className="mt-2 max-w-2xl text-white/90">
            Manage your profile information, security settings, and account preferences.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                router.push(`/profile?tab=${tab.id}`);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-orange-600 text-orange-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "profile" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
              <p className="mt-2 text-sm text-gray-600">
                Update your name, email, and profile picture. This feature is coming soon.
              </p>
            </div>
          )}

          {activeTab === "account" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              <p className="mt-2 text-sm text-gray-600">
                Manage notification preferences, security options, and connected accounts. This feature is coming soon.
              </p>
            </div>
          )}

          {activeTab === "password" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <form onSubmit={handlePasswordSubmit} className="mt-4 max-w-md space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current password
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New password
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {passwordMessage && (
                  <p
                    className={`text-sm ${
                      passwordMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {passwordMessage.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="animate-pulse rounded-xl bg-gray-100 h-64" />}>
      <ProfileContent />
    </Suspense>
  );
}
