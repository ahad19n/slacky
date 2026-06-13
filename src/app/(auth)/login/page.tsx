"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ workspaceSlug: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Login failed");
    router.push("/workspace");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-mono font-bold text-sm">#</span>
            </div>
            <span className="text-chalk font-semibold text-xl tracking-tight">Slacky</span>
          </div>
          <p className="text-chalk-muted text-sm">Sign in to your workspace</p>
        </div>

        <div className="bg-surface-800 rounded-xl border border-surface-600 p-6 space-y-4">
          <div>
            <label className="block text-xs text-chalk-muted mb-1.5 font-medium">Workspace</label>
            <div className="flex items-center bg-surface-700 rounded-lg border border-surface-600 focus-within:border-accent">
              <input
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-chalk-faint"
                placeholder="your-workspace"
                value={form.workspaceSlug}
                onChange={(e) => setForm({ ...form, workspaceSlug: e.target.value })}
              />
              <span className="text-chalk-faint text-xs pr-3">.slacky.app</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-chalk-muted mb-1.5 font-medium">Email</label>
            <input
              type="email"
              className="w-full bg-surface-700 rounded-lg border border-surface-600 focus:border-accent px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-chalk-faint"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs text-chalk-muted mb-1.5 font-medium">Password</label>
            <input
              type="password"
              className="w-full bg-surface-700 rounded-lg border border-surface-600 focus:border-accent px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-chalk-faint"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="text-center text-chalk-muted text-sm mt-6">
          New workspace?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
