"use client";

import { useState, useEffect } from "react";

interface PricingConfig {
  hourly_rate: number;
  daily_rate: number;
  min_hours: number;
  cost_per_km: number;
  min_travel_cost: number;
  max_travel_cost: number;
  max_service_radius_km: number;
  surcharge_holiday_percent: number;
  surcharge_night_percent: number;
  surcharge_weekend_percent: number;
  surcharge_urgent_flat: number;
  surcharge_floor_per_level: number;
  surcharge_floor_threshold: number;
  night_start_hour: number;
  night_end_hour: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";
function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : "";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function ConfigField({ label, value, unit, onChange, step, description }: {
  label: string;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
  step?: number;
  description?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step ?? 1}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        {unit && <span className="text-sm text-gray-500 whitespace-nowrap">{unit}</span>}
      </div>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );
}

export default function PricingPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchConfig() {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/admin/pricing`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message);
        setConfig(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/pricing`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setSuccess("Konfigurasi harga berhasil disimpan!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof PricingConfig, value: number) {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Memuat konfigurasi...</div>;
  if (!config) return <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary">Konfigurasi Harga</h1>
          <p className="text-sm text-gray-500 mt-1">Pengaturan tarif global yang berlaku untuk semua layanan</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-green-700">{success}</div>}

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Contoh:</strong> Tukang AC 3 jam, jarak 12 km, hari biasa = (3 × {formatCurrency(config.hourly_rate)}) + (12 × {formatCurrency(config.cost_per_km)}) = <strong>{formatCurrency(3 * config.hourly_rate + 12 * config.cost_per_km)}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarif Dasar */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Tarif Dasar</h2>
          <div className="space-y-4">
            <ConfigField label="Tarif Per Jam" value={config.hourly_rate} unit="Rp" onChange={(v) => update("hourly_rate", v)} description="Tarif dasar per jam kerja tukang" />
            <ConfigField label="Tarif Per Hari" value={config.daily_rate} unit="Rp" onChange={(v) => update("daily_rate", v)} description="Tarif harian (8 jam kerja)" />
            <ConfigField label="Minimum Jam" value={config.min_hours} unit="jam" onChange={(v) => update("min_hours", v)} description="Minimum jam booking untuk skema per jam" />
          </div>
        </div>

        {/* Biaya Perjalanan */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Biaya Perjalanan</h2>
          <div className="space-y-4">
            <ConfigField label="Biaya Per KM" value={config.cost_per_km} unit="Rp/km" onChange={(v) => update("cost_per_km", v)} />
            <ConfigField label="Minimum Ongkos" value={config.min_travel_cost} unit="Rp" onChange={(v) => update("min_travel_cost", v)} description="Jarak < 5km tetap dikenakan ini" />
            <ConfigField label="Maksimum Ongkos" value={config.max_travel_cost} unit="Rp" onChange={(v) => update("max_travel_cost", v)} description="Cap atas biaya perjalanan" />
            <ConfigField label="Radius Layanan Maks" value={config.max_service_radius_km} unit="km" onChange={(v) => update("max_service_radius_km", v)} description="Jarak lebih dari ini ditolak" />
          </div>
        </div>

        {/* Surcharge */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Surcharge (Biaya Tambahan)</h2>
          <div className="space-y-4">
            <ConfigField label="Hari Libur" value={config.surcharge_holiday_percent} unit="×" step={0.1} onChange={(v) => update("surcharge_holiday_percent", v)} description="Persentase dari tarif dasar (0.5 = +50%)" />
            <ConfigField label="Malam" value={config.surcharge_night_percent} unit="×" step={0.1} onChange={(v) => update("surcharge_night_percent", v)} description="Persentase dari tarif dasar (0.3 = +30%)" />
            <ConfigField label="Weekend" value={config.surcharge_weekend_percent} unit="×" step={0.1} onChange={(v) => update("surcharge_weekend_percent", v)} description="Sabtu-Minggu (0.2 = +20%)" />
            <ConfigField label="Urgent" value={config.surcharge_urgent_flat} unit="Rp" onChange={(v) => update("surcharge_urgent_flat", v)} description="Flat fee booking < 2 jam" />
            <ConfigField label="Per Lantai (di atas threshold)" value={config.surcharge_floor_per_level} unit="Rp" onChange={(v) => update("surcharge_floor_per_level", v)} />
            <ConfigField label="Threshold Lantai" value={config.surcharge_floor_threshold} unit="lantai" onChange={(v) => update("surcharge_floor_threshold", v)} description="Surcharge mulai aktif di atas lantai ini" />
          </div>
        </div>

        {/* Waktu */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-secondary mb-4">Jam Operasional</h2>
          <div className="space-y-4">
            <ConfigField label="Malam Mulai" value={config.night_start_hour} unit="WIB" onChange={(v) => update("night_start_hour", v)} description="Jam mulai surcharge malam" />
            <ConfigField label="Malam Berakhir" value={config.night_end_hour} unit="WIB" onChange={(v) => update("night_end_hour", v)} description="Jam surcharge malam berakhir" />
          </div>
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              Surcharge malam berlaku: <strong>{config.night_start_hour}:00 - {config.night_end_hour}:00 WIB</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
