"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useConfigSync } from "@/lib/use-realtime";

interface Category { code: string; name: string; icon_url: string | null; }

const ICONS: Record<string, string> = {
  AC: "🧊", BGN: "🧱", LST: "⚡", PLB: "🔧", LAS: "🔩", TKY: "🪵", CLN: "🧹", CAT: "🎨", TNM: "🌳",
};

export default function BookingPage() {
  const { isLoggedIn, token, apiFetch } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(() => {
    apiFetch<Category[]>("/categories").then(setCategories).catch(() => {}).finally(() => setLoading(false));
  }, [apiFetch]);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    loadCategories();
  }, [isLoggedIn, loadCategories, router]);

  // Auto-refresh when admin updates categories/services
  useConfigSync(token, (type) => {
    if (type === "config.categories_updated" || type === "config.services_updated") {
      loadCategories();
    }
  });

  if (!isLoggedIn) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-secondary">Pesan Tukang</h1>
      <p className="text-gray-500 mt-2">Pilih kategori layanan yang dibutuhkan</p>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Memuat...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          {categories.map((cat) => (
            <button key={cat.code} onClick={() => router.push(`/booking/${cat.code}?name=${encodeURIComponent(cat.name)}`)}
              className="bg-white rounded-xl border p-6 hover:border-primary hover:shadow-lg transition-all text-left">
              <span className="text-4xl">{ICONS[cat.code] ?? "🔨"}</span>
              <h3 className="font-semibold text-secondary mt-3">{cat.name}</h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
