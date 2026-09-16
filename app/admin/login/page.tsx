"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // If already signed in, hand off to the admin shell — the layout resolves the
  // admin role (super_admin → dashboard, staff → stores) and rejects non-admins.
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user) router.replace("/admin/dashboard");
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setError("Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Only admins (super/staff) have Better Auth accounts — the layout's
      // role gate routes by role and signs out anyone not in adminUsers.
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wf-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wearify-logo.svg" alt="Wearify" className="h-8 w-auto mx-auto mb-3" />
          <p className="text-sm text-wf-subtext">Mission Control</p>
        </div>

        <div className="bg-wf-card rounded-xl border border-wf-border p-8">
          <h2 className="text-lg font-bold text-wf-text mb-1">Sign in</h2>
          <p className="text-sm text-wf-subtext mb-6">Authorized personnel only</p>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-wf-subtext mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:border-wf-primary focus:ring-2 focus:ring-wf-primary/20 transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-wf-subtext mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-wf-border bg-white text-sm text-wf-text focus:outline-none focus:border-wf-primary focus:ring-2 focus:ring-wf-primary/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-wf-muted hover:text-wf-subtext cursor-pointer"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-lg bg-wf-red/10 border border-wf-red/20 text-sm text-wf-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-wf-primary text-white text-sm font-semibold hover:bg-wf-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-xs text-wf-muted text-center mt-6">
          Phygify Technoservices Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
