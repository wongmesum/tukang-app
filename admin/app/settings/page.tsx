"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";
function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : "";
}

interface RedisConfig {
  url: string;
  enabled: boolean;
  status: string;
  latency_ms: number | null;
}

interface QrisConfig {
  provider: string;
  is_production: boolean;
  server_key: string;
  client_key: string;
  webhook_secret: string;
  merchant_id: string;
  expiry_minutes: number;
}

export default function SettingsPage() {
  const [redis, setRedis] = useState<RedisConfig | null>(null);
  const [qris, setQris] = useState<QrisConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingRedis, setTestingRedis] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // QRIS form state
  const [qrisProvider, setQrisProvider] = useState("midtrans");
  const [qrisProduction, setQrisProduction] = useState(false);
  const [qrisServerKey, setQrisServerKey] = useState("");
  const [qrisClientKey, setQrisClientKey] = useState("");
  const [qrisWebhookSecret, setQrisWebhookSecret] = useState("");
  const [qrisMerchantId, setQrisMerchantId] = useState("");
  const [qrisExpiry, setQrisExpiry] = useState(15);

  // Redis form state
  const [redisUrl, setRedisUrl] = useState("");
  const [redisEnabled, setRedisEnabled] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);

      const { redis: r, qris: q } = json.data;
      setRedis(r);
      setQris(q);
      setRedisUrl(r.url);
      setRedisEnabled(r.enabled);
      setQrisProvider(q.provider);
      setQrisProduction(q.is_production);
      setQrisServerKey("");
      setQrisClientKey("");
      setQrisWebhookSecret("");
      setQrisMerchantId(q.merchant_id);
      setQrisExpiry(q.expiry_minutes);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal memuat" });
    } finally {
      setLoading(false);
    }
  }

  async function saveRedis() {
    setSaving(true);
    setMessage(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/settings/redis`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: redisUrl, enabled: redisEnabled }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setMessage({ type: "success", text: json.data.message });
      await fetchSettings();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal" });
    } finally {
      setSaving(false);
    }
  }

  async function saveQris() {
    setSaving(true);
    setMessage(null);
    try {
      const token = getToken();
      const body: Record<string, unknown> = {
        provider: qrisProvider,
        is_production: qrisProduction,
        merchant_id: qrisMerchantId,
        expiry_minutes: qrisExpiry,
      };
      // Only send keys if user typed new values (not empty = keep existing)
      if (qrisServerKey) body.server_key = qrisServerKey;
      if (qrisClientKey) body.client_key = qrisClientKey;
      if (qrisWebhookSecret) body.webhook_secret = qrisWebhookSecret;

      const res = await fetch(`${API_BASE}/admin/settings/qris`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setMessage({ type: "success", text: json.data.message });
      setQrisServerKey("");
      setQrisClientKey("");
      setQrisWebhookSecret("");
      await fetchSettings();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal" });
    } finally {
      setSaving(false);
    }
  }

  async function testRedisConnection() {
    setTestingRedis(true);
    setMessage(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/settings/redis/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setMessage({ type: "success", text: `Redis OK! Latency: ${json.data.latency_ms}ms` });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Test gagal" });
    } finally {
      setTestingRedis(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Memuat konfigurasi...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-6">Pengaturan Sistem</h1>

      {message && (
        <div className={`rounded-lg p-4 mb-6 ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Redis Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary">Redis</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              redis?.status === "connected" ? "bg-green-100 text-green-800" :
              redis?.status === "error" ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-500"
            }`}>
              {redis?.status ?? "unknown"}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Redis digunakan untuk OTP store dan token revocation. Tanpa Redis, data tersimpan di memory (hilang saat restart).
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Redis URL</label>
              <input
                type="text"
                value={redisUrl}
                onChange={(e) => setRedisUrl(e.target.value)}
                placeholder="redis://localhost:6379"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={redisEnabled}
                  onChange={(e) => setRedisEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm">Aktifkan Redis</span>
            </div>
            {redis?.latency_ms !== null && redis?.latency_ms !== undefined && (
              <p className="text-xs text-gray-400">Latency: {redis.latency_ms}ms</p>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={saveRedis}
              disabled={saving}
              className="flex-1 py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              onClick={testRedisConnection}
              disabled={testingRedis}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {testingRedis ? "Testing..." : "Test Koneksi"}
            </button>
          </div>
        </div>

        {/* QRIS Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary">QRIS Payment</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              qris?.is_production ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
            }`}>
              {qris?.is_production ? "PRODUCTION" : "SANDBOX"}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Konfigurasi payment gateway untuk pembayaran QRIS. Mendukung Midtrans, Xendit, dan DANA Bisnis.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={qrisProvider}
                onChange={(e) => setQrisProvider(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="midtrans">Midtrans</option>
                <option value="xendit">Xendit</option>
                <option value="dana">DANA Bisnis</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
              <input
                type="text"
                value={qrisMerchantId}
                onChange={(e) => setQrisMerchantId(e.target.value)}
                placeholder="M-XXXX"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Server Key <span className="text-gray-400">(current: {qris?.server_key || "belum diset"})</span>
              </label>
              <input
                type="password"
                value={qrisServerKey}
                onChange={(e) => setQrisServerKey(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengubah"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Key <span className="text-gray-400">(current: {qris?.client_key || "belum diset"})</span>
              </label>
              <input
                type="password"
                value={qrisClientKey}
                onChange={(e) => setQrisClientKey(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengubah"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Secret <span className="text-gray-400">(current: {qris?.webhook_secret || "belum diset"})</span>
              </label>
              <input
                type="password"
                value={qrisWebhookSecret}
                onChange={(e) => setQrisWebhookSecret(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengubah"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">QR Expiry (menit)</label>
              <input
                type="number"
                value={qrisExpiry}
                onChange={(e) => setQrisExpiry(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={qrisProduction}
                  onChange={(e) => setQrisProduction(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm">Mode Production</span>
              {qrisProduction && (
                <span className="text-xs text-red-500 font-medium">⚠️ Transaksi NYATA!</span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={saveQris}
              disabled={saving}
              className="w-full py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Konfigurasi QRIS"}
            </button>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-800 mb-2">Catatan Penting</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Perubahan Redis URL memerlukan restart server untuk berlaku.</li>
          <li>• Server Key dan Client Key tidak ditampilkan secara penuh demi keamanan.</li>
          <li>• Kosongkan field key jika tidak ingin mengubah (nilai lama tetap digunakan).</li>
          <li>• Hati-hati mengaktifkan mode Production — transaksi akan menggunakan uang nyata.</li>
          <li>• Webhook URL untuk provider: <code className="bg-blue-100 px-1 rounded">https://api.tukangndeso.id/v1/payments/webhook/qris</code></li>
        </ul>
      </div>
    </div>
  );
}
