"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : "";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

interface DashboardData {
  workers: { total: number; pending: number; active: number; suspended: number; avg_rating: number };
  orders: { total: number; by_status: Record<string, number> };
  revenue: { total: number };
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-secondary mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      const token = getToken();
      if (!token) {
        setError("Belum login. Buka /auto-login atau /login untuk masuk.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/admin/reports/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message ?? "API error");
        setData(json.data as DashboardData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Tidak dapat terhubung ke API");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Memuat dashboard...</div>;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-secondary mb-6">Dashboard</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 mb-4">{error}</p>
          <a href="/auto-login" className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600 inline-block">
            Auto Login →
          </a>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const revenue = formatCurrency(data.revenue.total);

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tukang" value={data.workers.total} icon="👷" />
        <StatCard label="Tukang Aktif" value={data.workers.active} icon="✅" />
        <StatCard label="Pending Verifikasi" value={data.workers.pending} icon="⏳" />
        <StatCard label="Total Revenue" value={revenue} icon="💰" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Order per Status</h2>
          {Object.keys(data.orders.by_status).length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada order</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.orders.by_status).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{status}</span>
                  <span className="font-semibold text-secondary">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Ringkasan</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-semibold">{data.orders.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold text-green-600">{revenue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Rating Tukang</span>
              <span className="font-semibold">{data.workers.avg_rating.toFixed(1)} ⭐</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Suspended</span>
              <span className="font-semibold text-red-500">{data.workers.suspended}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
