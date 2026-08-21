"use client";

import { useState, useEffect, useCallback } from "react";

interface DisputeOrder {
  id: string;
  order_number: string;
  status: string;
  customer_id: string;
  worker_id: string | null;
  service_id: string;
  total_estimate: number;
  total_final: number | null;
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

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [withRefund, setWithRefund] = useState(false);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/orders?status=DISPUTED`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      setDisputes(json.data as DisputeOrder[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  async function handleResolve(orderId: string) {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/dispute-resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: resolution || "Dispute ditutup oleh admin",
          refund: withRefund,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setResolving(null);
      setResolution("");
      setWithRefund(false);
      await fetchDisputes();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal resolve");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">Dispute Management</h1>
        <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
          {disputes.length} dispute aktif
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-gray-500">Tidak ada dispute aktif</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((order) => (
            <div key={order.id} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm text-gray-500">{order.order_number}</p>
                  <p className="font-medium mt-1">{order.service_id.split("-").slice(1).join(" ")}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>Customer: {order.customer_id.slice(0, 8)}...</span>
                    <span>Worker: {order.worker_id?.slice(0, 8) ?? "-"}...</span>
                    <span>{new Date(order.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  <p className="mt-2 font-semibold text-primary">
                    {formatCurrency(order.total_final ?? order.total_estimate)}
                  </p>
                </div>

                <div>
                  {resolving === order.id ? (
                    <div className="space-y-2 w-72">
                      <textarea
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="Catatan resolusi..."
                        className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={withRefund}
                          onChange={(e) => setWithRefund(e.target.checked)}
                          className="rounded"
                        />
                        <span>Refund pembayaran</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(order.id)}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => { setResolving(null); setResolution(""); setWithRefund(false); }}
                          className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolving(order.id)}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600"
                    >
                      Resolve Dispute
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
