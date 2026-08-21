"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export default function AutoLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Mengambil token admin...");

  useEffect(() => {
    async function autoLogin() {
      try {
        const res = await fetch(`${API_BASE.replace('/v1', '')}/dev/admin-token`);
        const json = await res.json();

        if (!json.success) {
          setStatus("Gagal: " + (json.error?.message ?? "Unknown error"));
          return;
        }

        const token = json.data.token;
        localStorage.setItem("admin_token", token);
        localStorage.setItem("admin_user", JSON.stringify({
          phone: json.data.phone,
          name: json.data.name,
          role: json.data.role,
        }));

        setStatus("Login berhasil! Mengalihkan...");
        setTimeout(() => router.push("/"), 500);
      } catch (e) {
        setStatus("Error: Pastikan API server berjalan di localhost:3000");
      }
    }

    autoLogin();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
