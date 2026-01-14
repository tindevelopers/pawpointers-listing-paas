"use client";

import React, { useState, useEffect } from "react";
import { getCurrentUser } from "@/app/actions/user";
import { createClient as createBrowserClient } from "@/core/database/client";
import type { Database } from "@/core/database/types";

type User = Database["public"]["Tables"]["users"]["Row"] & {
  roles?: { name: string } | null;
};

interface ConnectionStatus {
  connected: boolean;
  url: string | null;
  error: string | null;
  sessionActive: boolean;
  userId: string | null;
}

export default function SupabaseConnectionStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    url: null,
    error: null,
    sessionActive: false,
    userId: null,
  });
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    async function checkConnection() {
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        // Get Supabase URL from environment
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured";
        
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Get current user
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        // Get user profile from database
        const userData = await getCurrentUser();
        
        setConnectionStatus({
          connected: !sessionError && !userError,
          url: supabaseUrl,
          error: sessionError?.message || userError?.message || null,
          sessionActive: !!session,
          userId: authUser?.id || null,
        });
        
        setUser(userData);
      } catch (error) {
        console.error("Error checking Supabase connection:", error);
        setConnectionStatus({
          connected: false,
          url: null,
          error: error instanceof Error ? error.message : "Unknown error",
          sessionActive: false,
          userId: null,
        });
      } finally {
        setLoading(false);
      }
    }

    checkConnection();

    // Listen for auth changes
    const supabase = createBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkConnection();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function testConnection() {
    setTestingConnection(true);
    try {
      const supabase = createBrowserClient();
      
      // Test query to users table
      const { data, error } = await supabase
        .from("users")
        .select("id, email")
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      alert(`✅ Connection successful! Found ${data?.length || 0} user(s) in database.`);
    } catch (error) {
      console.error("Connection test error:", error);
      alert(`❌ Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setTestingConnection(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-dark">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Checking Supabase connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-dark">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Supabase Connection Status
          </h3>
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                connectionStatus.connected && connectionStatus.sessionActive
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {connectionStatus.connected && connectionStatus.sessionActive
                ? "Connected"
                : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Supabase URL */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Supabase URL
            </label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                {connectionStatus.url || "Not configured"}
              </code>
              {connectionStatus.url && (
                <a
                  href={connectionStatus.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Session Status */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Session Status
            </label>
            <div className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  connectionStatus.sessionActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {connectionStatus.sessionActive ? "Active" : "No Session"}
              </span>
            </div>
          </div>

          {/* User ID */}
          {connectionStatus.userId && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Authenticated User ID
              </label>
              <div className="mt-1">
                <code className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                  {connectionStatus.userId}
                </code>
              </div>
            </div>
          )}

          {/* Error Message */}
          {connectionStatus.error && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-400">
                <strong>Error:</strong> {connectionStatus.error}
              </p>
            </div>
          )}

          {/* Test Connection Button */}
          <button
            onClick={testConnection}
            disabled={testingConnection}
            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {testingConnection ? "Testing..." : "Test Database Connection"}
          </button>
        </div>
      </div>

      {/* User Data Card */}
      {user && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-dark">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Your Supabase User Data
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Email
              </label>
              <div className="mt-1">
                <code className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                  {user.email}
                </code>
              </div>
            </div>

            {user.full_name && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Full Name
                </label>
                <div className="mt-1">
                  <code className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {user.full_name}
                  </code>
                </div>
              </div>
            )}

            {user.roles && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Role
                </label>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {(user.roles as any)?.name || "No role"}
                  </span>
                </div>
              </div>
            )}

            {user.tenant_id && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Tenant ID
                </label>
                <div className="mt-1">
                  <code className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {user.tenant_id}
                  </code>
                </div>
              </div>
            )}

            {user.created_at && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Created At
                </label>
                <div className="mt-1">
                  <code className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {new Date(user.created_at).toLocaleString()}
                  </code>
                </div>
              </div>
            )}

            {/* Raw JSON Data */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
                View Raw JSON Data
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                {JSON.stringify(user, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

