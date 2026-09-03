"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/students";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid username or password");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-green-darker)" }}>
            Al-Ismat Academy
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in to manage attendance
          </p>
        </div>

        {error && <div className="flash-error mt-4">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="form-field mb-4">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" required autoFocus />
          </div>
          <div className="form-field mb-4">
            <label htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                style={{ paddingRight: 64 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--brand-green-dark)",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button className="btn w-full justify-center" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
