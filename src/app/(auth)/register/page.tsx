"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "create" | "join";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [form, setForm] = useState({
    workspaceName: "",
    workspaceSlug: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateSlug = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setForm((f) => ({ ...f, workspaceName: name, workspaceSlug: slug }));
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, mode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Registration failed");
    router.push("/workspace");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-mono font-bold text-sm">#</span>
            </div>
            <span className="text-chalk font-semibold text-xl tracking-tight">Slacky</span>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-700 rounded-lg p-1 mb-5 border border-surface-600">
          {(["create", "join"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-accent text-white"
                  : "text-chalk-muted hover:text-chalk"
              }`}
            >
              {m === "create" ? "Create workspace" : "Join workspace"}
            </button>
          ))}
        </div>

        <div className="bg-surface-800 rounded-xl border border-surface-600 p-6 space-y-4">
          {/* Workspace name — only for create */}
          {mode === "create" && (
            <div>
              <label className="block text-xs text-chalk-muted mb-1.5 font-medium">Workspace name</label>
              <input
                className="w-full bg-surface-700 rounded-lg border border-surface-600 focus:border-accent px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-chalk-faint"
                placeholder="Acme Corp"
                value={form.workspaceName}
                onChange={(e) => updateSlug(e.target.value)}
              />
            </div>
          )}

          {/* Workspace URL — always shown */}
          <div>
            <label className="block text-xs text-chalk-muted mb-1.5 font-medium">
              {mode === "create" ? "Workspace URL" : "Workspace to join"}
            </label>
            <div className="flex items-center bg-surface-700 rounded-lg border border-surface-600 focus-within:border-accent">
              <input
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-chalk-faint"
                placeholder="acme-corp"
                value={form.workspaceSlug}
                onChange={(e) => setForm({ ...form, workspaceSlug: e.target.value })}
                readOnly={mode === "create" && !!form.workspaceName}
              />
              <span className="text-chalk-faint text-xs pr-3">.slacky.app</span>
            </div>
            {mode === "join" && (
              <p className="text-chalk-faint text-xs mt-1 pl-1">Ask your admin for the workspace URL</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-chalk-muted mb-1.5 font-medium">Your name</label>
            <input
              className="w-full bg-surface-700 rounded-lg border border-surface-600 focus:border-accent px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-chalk-faint"
              placeholder="Ahmad"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
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
              placeholder="Min. 8 characters"
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
            {loading
              ? mode === "create" ? "Creating…" : "Joining…"
              : mode === "create" ? "Create workspace" : "Join workspace"}
          </button>
        </div>

        <p className="text-center text-chalk-muted text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
