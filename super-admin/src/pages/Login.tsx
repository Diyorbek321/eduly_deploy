/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/super-admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login muvaffaqiyatsiz");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl border border-gray-100"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Eduly</h1>
          <p className="text-sm text-gray-500 mt-1">Super Admin paneliga kirish</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm outline-none focus:border-[#ec5b13] focus:ring-1 focus:ring-[#ec5b13] h-11"
              placeholder="super@eduly.uz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Parol</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2 text-sm shadow-sm outline-none focus:border-[#ec5b13] focus:ring-1 focus:ring-[#ec5b13] h-11"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#ec5b13] py-3 text-sm font-bold text-white shadow-lg shadow-[#ec5b13]/20 hover:bg-[#d94e0d] disabled:opacity-50 transition-all"
          >
            {submitting ? "Kirilmoqda..." : "Kirish"}
          </button>
        </div>
      </form>
    </div>
  );
}
