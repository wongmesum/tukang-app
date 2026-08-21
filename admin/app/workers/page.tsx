"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Worker {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  status: string;
  ktp_number: string;
  skills: string[];
  rating_avg: number;
  total_orders: number;
  work_radius_km: number;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

function getToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("admin_token") ?? "";
  }
  return "";
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    suspended: "bg-red-100 text-red-800",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const endpoint = filter === "pending"
        ? "/admin/workers/pending"
        : "/admin/workers";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error?.message ?? "Failed");

      let data = json.data as Worker[];
      if (filter !== "all" && filter !== "pending") {
        data = data.filter((w) => w.status === filter);
      }
      setWorkers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  async function handleAction(userId: string, action: "verify" | "suspend" | "reactivate") {
    const token = getToken();
    const endpoint = `/admin/workers/${userId}/${action}`;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      await fetchWorkers();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal melakukan aksi");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">Kelola Tukang</h1>
        <div className="flex gap-2">
          {(["all", "pending", "active", "suspended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "Semua" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : workers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada data tukang</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">HP</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Keahlian</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Rating</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Orders</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {workers.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/workers/detail?id=${encodeURIComponent(worker.user_id)}`)}>
                  <td className="px-4 py-3 text-sm font-medium text-primary">{worker.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{worker.phone}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-1 flex-wrap">
                      {worker.skills.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{worker.rating_avg.toFixed(1)} ⭐</td>
                  <td className="px-4 py-3 text-sm">{worker.total_orders}</td>
                  <td className="px-4 py-3"><StatusBadge status={worker.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {worker.status === "pending" && (
                        <button
                          onClick={() => handleAction(worker.user_id, "verify")}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Verifikasi
                        </button>
                      )}
                      {worker.status === "active" && (
                        <button
                          onClick={() => handleAction(worker.user_id, "suspend")}
                          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          Suspend
                        </button>
                      )}
                      {worker.status === "suspended" && (
                        <button
                          onClick={() => handleAction(worker.user_id, "reactivate")}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          Aktifkan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border">
        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Token</label>
        <input
          type="password"
          placeholder="Paste JWT token admin..."
          className="w-full px-3 py-2 border rounded-lg text-sm"
          onChange={(e) => {
            if (typeof window !== "undefined") {
              localStorage.setItem("admin_token", e.target.value);
            }
          }}
          defaultValue={typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : ""}
        />
        <p className="text-xs text-gray-500 mt-1">
          Token didapat dari login sebagai admin via API
        </p>
      </div>
    </div>
  );
}
