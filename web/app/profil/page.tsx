"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function ProfilPage() {
  const { isLoggedIn, user, apiFetch, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    if (user) { setName(user.name); setEmail(user.email ?? ""); }
  }, [isLoggedIn, user, router]);

  async function saveProfile() {
    setSaving(true); setMessage("");
    try {
      await apiFetch("/me", { method: "PATCH", body: { name, email: email || null } });
      setMessage("Profil berhasil disimpan!");
    } catch (e) { setMessage("Gagal: " + (e instanceof Error ? e.message : "")); }
    finally { setSaving(false); }
  }

  if (!isLoggedIn) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-secondary mb-8">Profil Saya</h1>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
          <input type="text" value={user?.phone ?? ""} disabled className="w-full px-4 py-3 border rounded-xl bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (opsional)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" className="w-full px-4 py-3 border rounded-xl" />
        </div>

        {message && (
          <p className={`text-sm ${message.startsWith("Gagal") ? "text-red-600" : "text-green-600"}`}>{message}</p>
        )}

        <button onClick={saveProfile} disabled={saving}
          className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan Profil"}
        </button>
      </div>

      <div className="mt-8 space-y-3">
        <Link href="/orders" className="block bg-white rounded-xl border p-4 hover:border-primary transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <span className="font-medium text-secondary">Riwayat Order</span>
            </div>
            <span className="text-gray-300">›</span>
          </div>
        </Link>
        <Link href="/bantuan" className="block bg-white rounded-xl border p-4 hover:border-primary transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">❓</span>
              <span className="font-medium text-secondary">Bantuan</span>
            </div>
            <span className="text-gray-300">›</span>
          </div>
        </Link>
        <button onClick={() => { logout(); router.push("/"); }}
          className="w-full bg-white rounded-xl border p-4 hover:border-red-300 transition-all text-left">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚪</span>
            <span className="font-medium text-red-500">Keluar</span>
          </div>
        </button>
      </div>
    </div>
  );
}
