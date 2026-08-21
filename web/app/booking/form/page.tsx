"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface Service { id: string; name: string; base_hourly_rate: number; base_daily_rate: number; min_hours: number; }
interface Estimate {
  base_rate: number; distance_km: number; travel_cost: number;
  surcharge: { holiday: number; night: number; weekend: number; urgent: number; floor: number };
  total_estimate: number; breakdown_text: string;
}

export default function BookingFormPage() {
  const { isLoggedIn, apiFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [service, setService] = useState<Service | null>(null);

  const [scheme, setScheme] = useState<"hourly" | "daily">("hourly");
  const [duration, setDuration] = useState(2);
  const [description, setDescription] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [floorLevel, setFloorLevel] = useState(1);
  const [scheduledAt, setScheduledAt] = useState("");

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) { router.push("/login"); return; }
    const raw = searchParams.get("service");
    if (raw) { try { setService(JSON.parse(decodeURIComponent(raw))); } catch {} }
  }, [isLoggedIn, router, searchParams]);

  async function getEstimate() {
    if (!service) return;
    setLoadingEstimate(true); setError("");
    try {
      const data = await apiFetch<Estimate>("/pricing/estimate", {
        method: "POST",
        body: {
          service_id: service.id,
          pricing_scheme: scheme,
          duration,
          customer_location: { lat: -7.4724, lng: 112.4341 },
          scheduled_at: scheduledAt || null,
          floor_level: floorLevel,
          is_urgent: isUrgent,
        },
      });
      setEstimate(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setLoadingEstimate(false); }
  }

  async function submitOrder() {
    if (!service || !estimate) return;
    setSubmitting(true); setError("");
    try {
      const order = await apiFetch<{ id: string }>("/orders", {
        method: "POST",
        body: {
          service_id: service.id,
          pricing_scheme: scheme,
          estimated_duration: duration,
          description: description || null,
          photos: [],
          address_id: "web-default",
          customer_location: { lat: -7.4724, lng: 112.4341 },
          scheduled_at: scheduledAt || null,
          pricing: {
            base_rate: estimate.base_rate,
            distance_km: estimate.distance_km,
            travel_cost: estimate.travel_cost,
            surcharge: estimate.surcharge,
            total_estimate: estimate.total_estimate,
          },
        },
      });
      router.push(`/orders/${order.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal buat order"); }
    finally { setSubmitting(false); }
  }

  if (!service) return <div className="text-center py-20 text-gray-400">Memuat...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-primary text-sm mb-4">← Kembali</button>
      <h1 className="text-2xl font-bold text-secondary">{service.name}</h1>
      <p className="text-gray-500 text-sm mt-1">Isi detail pemesanan</p>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mt-4">{error}</div>}

      <div className="mt-8 space-y-6">
        {/* Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Skema Harga</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setScheme("hourly")}
              className={`p-4 rounded-xl border-2 text-left ${scheme === "hourly" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
              <p className="font-semibold">Per Jam</p>
              <p className="text-sm text-gray-500">Rp {service.base_hourly_rate.toLocaleString("id-ID")}/jam</p>
            </button>
            <button onClick={() => setScheme("daily")}
              className={`p-4 rounded-xl border-2 text-left ${scheme === "daily" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
              <p className="font-semibold">Per Hari</p>
              <p className="text-sm text-gray-500">Rp {service.base_daily_rate.toLocaleString("id-ID")}/hari</p>
            </button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durasi ({scheme === "hourly" ? "jam" : "hari"})
          </label>
          <input type="number" value={duration} min={scheme === "hourly" ? 2 : 1} max={scheme === "hourly" ? 12 : 30}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-3 border rounded-xl" />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jadwal (opsional, kosong = sekarang)</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl" />
        </div>

        {/* Floor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lantai</label>
          <input type="number" value={floorLevel} min={1} max={30} onChange={(e) => setFloorLevel(Number(e.target.value))}
            className="w-full px-4 py-3 border rounded-xl" />
        </div>

        {/* Urgent */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="w-5 h-5 rounded" />
          <span className="text-sm">Urgent (&lt; 2 jam, +Rp 25.000)</span>
        </label>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi masalah (opsional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} className="w-full px-4 py-3 border rounded-xl resize-none" placeholder="Jelaskan masalah Anda..." />
        </div>

        {/* Estimate button */}
        <button onClick={getEstimate} disabled={loadingEstimate}
          className="w-full py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 disabled:opacity-50">
          {loadingEstimate ? "Menghitung..." : "Lihat Estimasi Harga"}
        </button>

        {/* Estimate result */}
        {estimate && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-semibold text-secondary mb-3">Estimasi Harga</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Tarif dasar</span><span>Rp {estimate.base_rate.toLocaleString("id-ID")}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ongkos jalan ({estimate.distance_km} km)</span><span>Rp {estimate.travel_cost.toLocaleString("id-ID")}</span></div>
              {estimate.surcharge.night > 0 && <div className="flex justify-between text-orange-600"><span>Malam +30%</span><span>Rp {estimate.surcharge.night.toLocaleString("id-ID")}</span></div>}
              {estimate.surcharge.weekend > 0 && <div className="flex justify-between text-orange-600"><span>Weekend +20%</span><span>Rp {estimate.surcharge.weekend.toLocaleString("id-ID")}</span></div>}
              {estimate.surcharge.holiday > 0 && <div className="flex justify-between text-orange-600"><span>Libur +50%</span><span>Rp {estimate.surcharge.holiday.toLocaleString("id-ID")}</span></div>}
              {estimate.surcharge.urgent > 0 && <div className="flex justify-between text-orange-600"><span>Urgent</span><span>Rp {estimate.surcharge.urgent.toLocaleString("id-ID")}</span></div>}
              {estimate.surcharge.floor > 0 && <div className="flex justify-between text-orange-600"><span>Lantai</span><span>Rp {estimate.surcharge.floor.toLocaleString("id-ID")}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span><span className="text-primary">Rp {estimate.total_estimate.toLocaleString("id-ID")}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{estimate.breakdown_text}</p>

            <button onClick={submitOrder} disabled={submitting}
              className="w-full mt-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
              {submitting ? "Memproses..." : "Konfirmasi & Cari Tukang"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
