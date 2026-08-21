"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface Order {
  id: string; order_number: string; status: string; service_id: string;
  pricing_scheme: string; estimated_duration: number; description: string | null;
  worker_id: string | null; created_at: string; started_at: string | null; completed_at: string | null;
  pricing: { base_rate: number; distance_km: number; travel_cost: number; total_estimate: number; total_final: number | null;
    surcharge: { holiday: number; night: number; weekend: number; urgent: number; floor: number } };
}

interface Payment { payment_id: string; qr_string: string; amount: number; status: string; }

const FLOW = ["PENDING","MATCHED","ACCEPTED","EN_ROUTE","ARRIVED","IN_PROGRESS","COMPLETED","PAID","REVIEWED"];

export default function OrderDetailPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadOrder(); }, [id]);

  async function loadOrder() {
    try {
      const data = await apiFetch<Order>(`/orders/${id}`);
      setOrder(data);
    } catch {} finally { setLoading(false); }
  }

  async function createPayment() {
    setActionLoading(true);
    try {
      const data = await apiFetch<Payment>("/payments/qris/create", { method: "POST", body: { order_id: id } });
      setPayment(data);
    } catch {} finally { setActionLoading(false); }
  }

  async function simulatePay() {
    if (!payment) return;
    setActionLoading(true);
    try {
      await apiFetch("/payments/simulate-paid", { method: "POST", body: { payment_id: payment.payment_id } });
      await loadOrder();
      setPayment(null);
    } catch {} finally { setActionLoading(false); }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Memuat...</div>;
  if (!order) return <div className="text-center py-20 text-gray-400">Order tidak ditemukan</div>;

  const currentIdx = FLOW.indexOf(order.status);
  const isFailed = ["EXPIRED","CANCELLED_BY_CUSTOMER","CANCELLED_BY_WORKER","DISPUTED"].includes(order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button onClick={() => router.push("/orders")} className="text-gray-500 hover:text-primary text-sm mb-4">← Order Saya</button>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-sm text-gray-500">{order.order_number}</p>
          <h1 className="text-xl font-bold text-secondary mt-1">{order.service_id.split("-").slice(1).join(" ")}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isFailed ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800"}`}>
          {order.status}
        </span>
      </div>

      {/* Timeline */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-2">
        {FLOW.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
              s === order.status ? "bg-primary text-white font-bold" :
              i <= currentIdx && !isFailed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
            }`}>{s}</div>
            {i < FLOW.length - 1 && <div className="w-3 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="mt-8 bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-secondary mb-3">Rincian Harga</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Tarif dasar</span><span>Rp {order.pricing.base_rate.toLocaleString("id-ID")}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Ongkos ({order.pricing.distance_km} km)</span><span>Rp {order.pricing.travel_cost.toLocaleString("id-ID")}</span></div>
          {order.pricing.surcharge.night > 0 && <div className="flex justify-between text-orange-600"><span>Malam</span><span>+Rp {order.pricing.surcharge.night.toLocaleString("id-ID")}</span></div>}
          {order.pricing.surcharge.weekend > 0 && <div className="flex justify-between text-orange-600"><span>Weekend</span><span>+Rp {order.pricing.surcharge.weekend.toLocaleString("id-ID")}</span></div>}
          {order.pricing.surcharge.urgent > 0 && <div className="flex justify-between text-orange-600"><span>Urgent</span><span>+Rp {order.pricing.surcharge.urgent.toLocaleString("id-ID")}</span></div>}
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total</span><span className="text-primary">Rp {(order.pricing.total_final ?? order.pricing.total_estimate).toLocaleString("id-ID")}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {order.status === "COMPLETED" && !payment && (
          <button onClick={createPayment} disabled={actionLoading}
            className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
            {actionLoading ? "Memproses..." : "Bayar Sekarang (QRIS)"}
          </button>
        )}

        {payment && payment.status === "pending" && (
          <div className="bg-white rounded-xl border p-6 text-center">
            <h3 className="font-semibold text-secondary mb-2">Scan QRIS untuk Bayar</h3>
            <div className="bg-gray-100 rounded-xl p-8 mb-4">
              <p className="font-mono text-xs break-all text-gray-500">{payment.qr_string}</p>
              <p className="text-2xl font-bold text-primary mt-4">Rp {payment.amount.toLocaleString("id-ID")}</p>
            </div>
            <p className="text-sm text-gray-500 mb-4">Scan dengan e-wallet atau mobile banking</p>
            <button onClick={simulatePay} disabled={actionLoading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50">
              {actionLoading ? "..." : "[DEV] Simulasi Bayar"}
            </button>
          </div>
        )}

        {order.status === "PAID" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-700 font-semibold text-lg">Pembayaran Berhasil!</p>
            <p className="text-green-600 text-sm mt-1">Terima kasih telah menggunakan TukangNDeso</p>
          </div>
        )}

        {["PENDING","MATCHED"].includes(order.status) && (
          <button onClick={() => router.push(`/orders/${id}`)} className="w-full py-3 border-2 border-gray-200 text-gray-500 rounded-xl text-sm hover:border-red-300 hover:text-red-500">
            Batalkan Order
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 text-sm text-gray-500 space-y-1">
        <p>Dibuat: {new Date(order.created_at).toLocaleString("id-ID")}</p>
        {order.started_at && <p>Mulai kerja: {new Date(order.started_at).toLocaleString("id-ID")}</p>}
        {order.completed_at && <p>Selesai: {new Date(order.completed_at).toLocaleString("id-ID")}</p>}
        {order.description && <p>Catatan: {order.description}</p>}
      </div>
    </div>
  );
}
