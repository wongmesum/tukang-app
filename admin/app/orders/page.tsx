"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  worker_id: string | null;
  service_id: string;
  status: string;
  pricing_scheme: string;
  estimated_duration: number;
  created_at: string;
  pricing: {
    total_estimate: number;
    total_final: number | null;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

function getToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("admin_token") ?? "";
  }
  return "";
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  MATCHED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  EN_ROUTE: "bg-purple-100 text-purple-800",
  ARRIVED: "bg-teal-100 text-teal-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  REVIEWED: "bg-gray-100 text-gray-800",
  CANCELLED_BY_CUSTOMER: "bg-red-100 text-red-800",
  CANCELLED_BY_WORKER: "bg-red-100 text-red-800",
  DISPUTED: "bg-rose-100 text-rose-800",
  EXPIRED: "bg-gray-100 text-gray-500",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API_BASE}/admin/orders${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      setOrders(json.data as Order[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const statuses = [
    "", "PENDING", "MATCHED", "ACCEPTED", "EN_ROUTE", "ARRIVED",
    "IN_PROGRESS", "COMPLETED", "PAID", "REVIEWED", "DISPUTED",
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Semua Status</option>
          {statuses.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada order</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">No. Order</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Layanan</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Skema</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Durasi</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/orders/detail?id=${encodeURIComponent(order.id)}`)}>
                  <td className="px-4 py-3 text-sm font-mono text-primary">{order.order_number}</td>
                  <td className="px-4 py-3 text-sm">{order.service_id.split("-").slice(1, 3).join(" ")}</td>
                  <td className="px-4 py-3 text-sm capitalize">{order.pricing_scheme}</td>
                  <td className="px-4 py-3 text-sm">
                    {order.estimated_duration} {order.pricing_scheme === "hourly" ? "jam" : "hari"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatCurrency(order.pricing.total_final ?? order.pricing.total_estimate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
