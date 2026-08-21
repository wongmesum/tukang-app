"use client";

import { useState, useEffect } from "react";

interface ReportSummary {
  workers: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    avg_rating: number;
  };
  orders: {
    total: number;
    by_status: Record<string, number>;
  };
  revenue: {
    total: number;
  };
}

interface RevenuePoint {
  date: string;
  revenue: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

function getToken(): string {
  if (typeof window !== "undefined") return localStorage.getItem("admin_token") ?? "";
  return "";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-lg font-semibold text-secondary mb-4">Revenue Harian (30 hari)</h2>
      <div className="flex items-end gap-1 h-48 overflow-x-auto">
        {data.map((point) => {
          const height = (point.revenue / maxRevenue) * 100;
          return (
            <div key={point.date} className="flex flex-col items-center min-w-[20px] group relative">
              <div
                className="w-4 bg-primary rounded-t hover:bg-orange-600 transition-colors"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${point.date}: ${formatCurrency(point.revenue)}`}
              />
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {point.date.slice(5)}: {formatCurrency(point.revenue)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0</span>
        <span>{formatCurrency(maxRevenue)}</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const token = getToken();

        const [summaryRes, revenueRes] = await Promise.all([
          fetch(`${API_BASE}/admin/reports/summary`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/admin/reports/revenue`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const summaryJson = await summaryRes.json();
        if (!summaryJson.success) throw new Error(summaryJson.error?.message ?? "Failed");
        setData(summaryJson.data as ReportSummary);

        const revenueJson = await revenueRes.json();
        if (revenueJson.success) {
          setRevenueData(revenueJson.data as RevenuePoint[]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Memuat laporan...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-800">{error}</p></div>;
  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-6">Laporan</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(data.revenue.total)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-xl font-bold text-secondary mt-1">{data.orders.total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Tukang Aktif</p>
          <p className="text-xl font-bold text-secondary mt-1">{data.workers.active}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Avg Rating</p>
          <p className="text-xl font-bold text-secondary mt-1">{data.workers.avg_rating.toFixed(1)} ⭐</p>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && <div className="mb-6"><RevenueChart data={revenueData} /></div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Distribusi Order</h2>
          <div className="space-y-2">
            {Object.entries(data.orders.by_status)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const percentage = data.orders.total > 0 ? (count / data.orders.total) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Worker Stats */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Statistik Tukang</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Terdaftar</span>
              <span className="font-bold text-lg">{data.workers.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Aktif</span>
              <span className="font-bold text-lg text-green-600">{data.workers.active}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending Verifikasi</span>
              <span className="font-bold text-lg text-yellow-600">{data.workers.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Suspended</span>
              <span className="font-bold text-lg text-red-600">{data.workers.suspended}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Rating</span>
              <span className="font-bold text-lg">{data.workers.avg_rating.toFixed(1)} ⭐</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
