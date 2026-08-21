"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

interface Order {
  id: string; order_number: string; status: string; service_id: string;
  pricing_scheme: string; estimated_duration: number; created_at: string;
  pricing: { total_estimate: number; total_final: number | null };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800", MATCHED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800", EN_ROUTE: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800", COMPLETED: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800", REVIEWED: "bg-gray-100 text-gray-600",
  CANCELLED_BY_CUSTOMER: "bg-red-100 text-red-700", EXPIRED: "bg-gray-100 text-gray-500",
};

export default function OrdersPage() {
  const { isLoggedIn, apiFetch } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    apiFetch<Order[]>("/orders").then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, [isLoggedIn, apiFetch, router]);

  if (!isLoggedIn) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-secondary">Order Saya</h1>
        <Link href="/booking" className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-orange-600">
          + Pesan Baru
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">Belum ada order</p>
          <Link href="/booking" className="mt-4 inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600">
            Pesan Tukang Sekarang
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}
              className="block bg-white rounded-xl border p-5 hover:border-primary hover:shadow transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-gray-500">{order.order_number}</p>
                  <p className="font-semibold text-secondary mt-1">{order.service_id.split("-").slice(1).join(" ")}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {order.estimated_duration} {order.pricing_scheme === "hourly" ? "jam" : "hari"} &middot; {new Date(order.created_at).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}>
                    {order.status}
                  </span>
                  <p className="text-primary font-bold mt-2">
                    Rp {(order.pricing.total_final ?? order.pricing.total_estimate).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
