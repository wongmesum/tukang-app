"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
  id: string;
  order_number: string;
  customer_id: string;
  worker_id: string | null;
  service_id: string;
  status: string;
  pricing_scheme: string;
  estimated_duration: number;
  description: string | null;
  photos: string[];
  address_id: string;
  customer_location: { lat: number; lng: number };
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  pricing: {
    base_rate: number;
    distance_km: number;
    travel_cost: number;
    surcharge: {
      holiday: number;
      night: number;
      weekend: number;
      urgent: number;
      floor: number;
    };
    total_estimate: number;
    total_final: number | null;
    actual_duration: number | null;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

function getToken(): string {
  if (typeof window !== "undefined") return localStorage.getItem("admin_token") ?? "";
  return "";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_FLOW = [
  "PENDING", "MATCHED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED", "PAID", "REVIEWED",
];

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const isFailed = ["EXPIRED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_WORKER", "DISPUTED"].includes(currentStatus);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STATUS_FLOW.map((status, i) => {
        const isActive = i <= currentIndex && !isFailed;
        const isCurrent = status === currentStatus;
        return (
          <div key={status} className="flex items-center">
            <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
              isCurrent ? "bg-primary text-white" :
              isActive ? "bg-green-100 text-green-800" :
              "bg-gray-100 text-gray-400"
            }`}>
              {status}
            </div>
            {i < STATUS_FLOW.length - 1 && <div className="w-4 h-0.5 bg-gray-200 mx-0.5" />}
          </div>
        );
      })}
      {isFailed && (
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-gray-200 mx-0.5" />
          <div className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            {currentStatus}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/admin/orders?status=`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message);
        // Find the specific order from the list (admin API returns all)
        // For a proper implementation, add GET /admin/orders/:id endpoint
        const found = (json.data as OrderDetail[]).find((o) => o.id === orderId);
        if (!found) throw new Error("Order tidak ditemukan");
        setOrder(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Memuat...</div>;
  if (error) return <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>;
  if (!order) return null;

  const surchargeTotal = order.pricing.surcharge.holiday + order.pricing.surcharge.night +
    order.pricing.surcharge.weekend + order.pricing.surcharge.urgent + order.pricing.surcharge.floor;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/orders" className="text-gray-500 hover:text-gray-700">← Kembali</Link>
        <h1 className="text-2xl font-bold text-secondary">{order.order_number}</h1>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Status Timeline</h2>
        <StatusTimeline currentStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Informasi Order</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Order ID</dt>
              <dd className="font-mono text-sm">{order.id.slice(0, 8)}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Layanan</dt>
              <dd>{order.service_id.split("-").slice(1).join(" ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Skema</dt>
              <dd className="capitalize">{order.pricing_scheme}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Durasi</dt>
              <dd>{order.estimated_duration} {order.pricing_scheme === "hourly" ? "jam" : "hari"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Customer ID</dt>
              <dd className="font-mono text-sm">{order.customer_id.slice(0, 8)}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Worker ID</dt>
              <dd className="font-mono text-sm">{order.worker_id?.slice(0, 8) ?? "-"}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Lokasi</dt>
              <dd className="text-sm">{order.customer_location.lat.toFixed(4)}, {order.customer_location.lng.toFixed(4)}</dd>
            </div>
            {order.description && (
              <div>
                <dt className="text-gray-500 mb-1">Deskripsi</dt>
                <dd className="text-sm bg-gray-50 p-2 rounded">{order.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Pricing Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Rincian Harga</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Tarif Dasar</dt>
              <dd className="font-medium">{formatCurrency(order.pricing.base_rate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Jarak</dt>
              <dd>{order.pricing.distance_km} km</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Biaya Perjalanan</dt>
              <dd>{formatCurrency(order.pricing.travel_cost)}</dd>
            </div>
            {order.pricing.surcharge.night > 0 && (
              <div className="flex justify-between text-orange-600">
                <dt>Surcharge Malam (+30%)</dt>
                <dd>{formatCurrency(order.pricing.surcharge.night)}</dd>
              </div>
            )}
            {order.pricing.surcharge.weekend > 0 && (
              <div className="flex justify-between text-orange-600">
                <dt>Surcharge Weekend (+20%)</dt>
                <dd>{formatCurrency(order.pricing.surcharge.weekend)}</dd>
              </div>
            )}
            {order.pricing.surcharge.holiday > 0 && (
              <div className="flex justify-between text-orange-600">
                <dt>Surcharge Libur (+50%)</dt>
                <dd>{formatCurrency(order.pricing.surcharge.holiday)}</dd>
              </div>
            )}
            {order.pricing.surcharge.urgent > 0 && (
              <div className="flex justify-between text-orange-600">
                <dt>Surcharge Urgent</dt>
                <dd>{formatCurrency(order.pricing.surcharge.urgent)}</dd>
              </div>
            )}
            {order.pricing.surcharge.floor > 0 && (
              <div className="flex justify-between text-orange-600">
                <dt>Surcharge Lantai</dt>
                <dd>{formatCurrency(order.pricing.surcharge.floor)}</dd>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <dt>Total {order.pricing.total_final ? "(Final)" : "(Estimasi)"}</dt>
              <dd className="text-primary">{formatCurrency(order.pricing.total_final ?? order.pricing.total_estimate)}</dd>
            </div>
            {surchargeTotal > 0 && (
              <p className="text-xs text-gray-400">Total surcharge: {formatCurrency(surchargeTotal)}</p>
            )}
          </dl>
        </div>

        {/* Timestamps */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Waktu</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Dibuat</dt>
              <dd className="text-sm">{formatDate(order.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Dijadwalkan</dt>
              <dd className="text-sm">{formatDate(order.scheduled_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Mulai Kerja</dt>
              <dd className="text-sm">{formatDate(order.started_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Selesai</dt>
              <dd className="text-sm">{formatDate(order.completed_at)}</dd>
            </div>
          </dl>
        </div>

        {/* Photos */}
        {order.photos.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-secondary mb-4">Foto</h2>
            <div className="grid grid-cols-3 gap-2">
              {order.photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
