"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ChangePasswordForm() {
  const search = useSearchParams();
  const token = search.get("token");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submitToken(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch('/api/auth/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    const data = await res.json();
    setStatus(data.ok ? 'Password updated' : data.error || 'Error');
  }

  async function submitChange(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch('/api/auth/password/change', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, currentPassword, newPassword: password }) });
    const data = await res.json();
    setStatus(data.ok ? 'Password updated' : data.error || 'Error');
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4">Change Password</h1>
        {token ? (
          <form onSubmit={submitToken} className="space-y-4">
            <div>
              <label className="block text-sm">New password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border p-2 rounded" />
            </div>
            <button className="btn-primary">Set Password</button>
          </form>
        ) : (
          <form onSubmit={submitChange} className="space-y-4">
            <div>
              <label className="block text-sm">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm">Current password</label>
              <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm">New password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border p-2 rounded" />
            </div>
            <button className="btn-primary">Change Password</button>
          </form>
        )}
        {status && <p className="mt-4">{status}</p>}
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted">Loading...</p></div>}>
      <ChangePasswordForm />
    </Suspense>
  );
}
