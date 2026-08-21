"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface WorkerDetail {
  user_id: string;
  name: string;
  phone: string;
  ktp_number: string;
  ktp_photo_url: string;
  bio: string | null;
  skills: string[];
  work_radius_km: number;
  home_location: { lat: number; lng: number };
  is_available: boolean;
  rating_avg: number;
  total_orders: number;
  status: string;
  created_at: string;
  verified_at: string | null;
}

interface WorkerOrder {
  id: string;
  order_number: string;
  status: string;
  service_id: string;
  total_estimate: number;
  total_final: number | null;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

function getToken(): string {
  if (typeof window !== "undefined") return localStorage.getItem("admin_token") ?? "";
  return "";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
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

export default function WorkerDetailPage() {
  const params = useParams();
  const workerId = params.id as string;
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      const token = getToken();
      try {
        // Fetch worker info from admin workers list
        const workersRes = await fetch(`${API_BASE}/admin/workers/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const workersJson = await workersRes.json();
        if (!workersJson.success) throw new Error(workersJson.error?.message);

        const found = (workersJson.data as WorkerDetail[]).find((w) => w.user_id === workerId);
        if (!found) throw new Error("Tukang tidak ditemukan");
        setWorker(found);

        // Fetch reviews
        try {
          const reviewsRes = await fetch(`${API_BASE}/workers/${workerId}/reviews`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const reviewsJson = await reviewsRes.json();
          if (reviewsJson.success) {
            setReviews(reviewsJson.data.items ?? []);
          }
        } catch {
          // Reviews may fail if endpoint requires different auth
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [workerId]);

  async function handleAction(action: "verify" | "suspend" | "reactivate") {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/workers/${workerId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      // Refresh
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal");
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Memuat...</div>;
  if (error) return <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>;
  if (!worker) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/workers" className="text-gray-500 hover:text-gray-700">← Kembali</Link>
        <h1 className="text-2xl font-bold text-secondary">Detail Tukang</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary">Profil</h2>
            <StatusBadge status={worker.status} />
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-400">Nama</dt>
              <dd className="font-medium">{worker.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">HP</dt>
              <dd>{worker.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">KTP</dt>
              <dd className="font-mono text-sm">{worker.ktp_number}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Bio</dt>
              <dd className="text-sm">{worker.bio ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Radius Kerja</dt>
              <dd>{worker.work_radius_km} km</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Lokasi Rumah</dt>
              <dd className="text-sm">{worker.home_location.lat.toFixed(4)}, {worker.home_location.lng.toFixed(4)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Keahlian</dt>
              <dd className="flex gap-1 flex-wrap mt-1">
                {worker.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Terdaftar</dt>
              <dd className="text-sm">{new Date(worker.created_at).toLocaleDateString("id-ID")}</dd>
            </div>
          </dl>

          <div className="mt-6 flex gap-2">
            {worker.status === "pending" && (
              <button onClick={() => handleAction("verify")} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Verifikasi</button>
            )}
            {worker.status === "active" && (
              <button onClick={() => handleAction("suspend")} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">Suspend</button>
            )}
            {worker.status === "suspended" && (
              <button onClick={() => handleAction("reactivate")} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">Aktifkan</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-secondary mb-4">Statistik</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{worker.rating_avg.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-secondary">{worker.total_orders}</p>
                <p className="text-xs text-gray-500">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{worker.is_available ? "Online" : "Offline"}</p>
                <p className="text-xs text-gray-500">Status</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-secondary">{worker.work_radius_km} km</p>
                <p className="text-xs text-gray-500">Radius</p>
              </div>
            </div>
          </div>

          {worker.ktp_photo_url && (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-lg font-semibold text-secondary mb-3">Foto KTP</h2>
              <a href={worker.ktp_photo_url} target="_blank" rel="noreferrer">
                <img
                  src={worker.ktp_photo_url}
                  alt="KTP"
                  className="w-full rounded-lg border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </a>
            </div>
          )}
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Review ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada review</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reviews.map((r) => (
                <div key={r.id} className="border-b pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-500">{"⭐".repeat(r.rating)}</span>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
