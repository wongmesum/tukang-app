"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";
const token = () => (typeof window === "undefined" ? "" : localStorage.getItem("admin_token") ?? "");

type RedisConfig = { enabled: boolean; url: string; configured: boolean; status: string };
type QrisConfig = { enabled: boolean; provider: "midtrans"; is_production: boolean; server_key: string; client_key: string; webhook_secret: string; merchant_id: string; expiry_minutes: number };
type OtpConfig = { enabled: boolean; provider: "fonnte" | "console"; api_token: string; expiry_seconds: number; max_attempts: number; message_template: string };
type GoogleConfig = { enabled: boolean; web_client_id: string; android_client_id: string; ios_client_id: string };
type Settings = { redis: RedisConfig; qris: QrisConfig; otp: OtpConfig; google_auth: GoogleConfig };

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${API_BASE}/admin/settings${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json();
  if (!json.success) throw new Error(json.error?.message ?? "Permintaan gagal");
  return json.data;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-orange-500"/><span className="text-sm font-medium">{label}</span></label>;
}

function Field({ label, value, onChange, type = "text", placeholder, min, max }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; min?: number; max?: number }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} className="w-full px-3 py-2 border rounded-lg text-sm"/></label>;
}

function Card({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return <section className="bg-white rounded-xl p-6 shadow-sm border"><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold text-secondary">{title}</h2>{badge && <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{badge}</span>}</div>{children}</section>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [redisUrl, setRedisUrl] = useState("");
  const [qrisSecrets, setQrisSecrets] = useState({ server_key: "", client_key: "", webhook_secret: "" });
  const [otpToken, setOtpToken] = useState("");

  const load = useCallback(async () => {
    try { setSettings(await api("")); } catch (error) { setNotice({ ok: false, text: error instanceof Error ? error.message : "Gagal memuat" }); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function patch<K extends keyof Settings>(key: K, value: Partial<Settings[K]>) {
    setSettings((current) => current ? { ...current, [key]: { ...current[key], ...value } } : current);
  }

  async function save(path: string, body: unknown, key: string) {
    setBusy(key); setNotice(null);
    try { const data = await api(path, "PUT", body); setNotice({ ok: true, text: data.message }); await load(); }
    catch (error) { setNotice({ ok: false, text: error instanceof Error ? error.message : "Gagal menyimpan" }); }
    finally { setBusy(""); }
  }

  if (!settings) return <div className="py-12 text-center text-gray-500">Memuat konfigurasi...</div>;
  const { redis, qris, otp, google_auth: google } = settings;

  return <div>
    <h1 className="text-2xl font-bold text-secondary mb-2">Pengaturan Integrasi</h1>
    <p className="text-sm text-gray-500 mb-6">Perubahan diterapkan backend secara langsung ke web dan APK. Secret tetap tersimpan terenkripsi di server.</p>
    {notice && <div className={`rounded-lg p-4 mb-6 border ${notice.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{notice.text}</div>}

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card title="Redis" badge={redis.status}>
        <p className="text-sm text-gray-500 mb-4">Penyimpanan OTP dan token revocation. URL saat ini: <code>{redis.url || "belum diset"}</code></p>
        <div className="space-y-4">
          <Toggle checked={redis.enabled} onChange={(value) => patch("redis", { enabled: value })} label="Aktifkan Redis"/>
          <Field label="Redis URL baru" value={redisUrl} onChange={setRedisUrl} type="password" placeholder="Kosongkan untuk mempertahankan URL lama"/>
          <div className="flex gap-2"><button disabled={busy !== ""} onClick={() => void save("/redis", { enabled: redis.enabled, ...(redisUrl ? { url: redisUrl } : {}) }, "redis")} className="flex-1 py-2 bg-primary text-white rounded-lg disabled:opacity-50">Simpan</button><button disabled={busy !== ""} onClick={async () => { setBusy("redis-test"); try { const data = await api("/redis/test", "POST"); setNotice({ ok: true, text: `Redis OK (${data.latency_ms} ms)` }); } catch (error) { setNotice({ ok: false, text: error instanceof Error ? error.message : "Test gagal" }); } finally { setBusy(""); } }} className="px-4 py-2 border rounded-lg">Test</button></div>
        </div>
      </Card>

      <Card title="QRIS Midtrans" badge={qris.is_production ? "PRODUCTION" : "SANDBOX"}>
        <div className="space-y-4">
          <Toggle checked={qris.enabled} onChange={(value) => patch("qris", { enabled: value })} label="Aktifkan pembayaran QRIS"/>
          <Toggle checked={qris.is_production} onChange={(value) => patch("qris", { is_production: value })} label="Mode production (transaksi nyata)"/>
          <Field label="Merchant ID" value={qris.merchant_id} onChange={(value) => patch("qris", { merchant_id: value })}/>
          <Field label={`Server Key (${qris.server_key || "belum diset"})`} value={qrisSecrets.server_key} onChange={(value) => setQrisSecrets({ ...qrisSecrets, server_key: value })} type="password" placeholder="Kosongkan untuk mempertahankan"/>
          <Field label={`Client Key (${qris.client_key || "belum diset"})`} value={qrisSecrets.client_key} onChange={(value) => setQrisSecrets({ ...qrisSecrets, client_key: value })} type="password" placeholder="Kosongkan untuk mempertahankan"/>
          <Field label={`Webhook Secret (${qris.webhook_secret || "belum diset"})`} value={qrisSecrets.webhook_secret} onChange={(value) => setQrisSecrets({ ...qrisSecrets, webhook_secret: value })} type="password" placeholder="Minimal 16 karakter"/>
          <Field label="Kedaluwarsa QR (menit)" value={qris.expiry_minutes} onChange={(value) => patch("qris", { expiry_minutes: Number(value) })} type="number" min={5} max={60}/>
          <button disabled={busy !== ""} onClick={() => void save("/qris", { enabled: qris.enabled, provider: "midtrans", is_production: qris.is_production, merchant_id: qris.merchant_id, expiry_minutes: qris.expiry_minutes, ...Object.fromEntries(Object.entries(qrisSecrets).filter(([, value]) => value)) }, "qris")} className="w-full py-2 bg-primary text-white rounded-lg disabled:opacity-50">Simpan QRIS</button>
        </div>
      </Card>

      <Card title="OTP WhatsApp" badge={otp.provider.toUpperCase()}>
        <div className="space-y-4">
          <Toggle checked={otp.enabled} onChange={(value) => patch("otp", { enabled: value })} label="Aktifkan login OTP"/>
          <label className="block"><span className="block text-sm font-medium mb-1">Provider</span><select value={otp.provider} onChange={(e) => patch("otp", { provider: e.target.value as OtpConfig["provider"] })} className="w-full px-3 py-2 border rounded-lg"><option value="fonnte">Fonnte WhatsApp</option><option value="console">Console (development)</option></select></label>
          <Field label={`API Token (${otp.api_token || "belum diset"})`} value={otpToken} onChange={setOtpToken} type="password" placeholder="Kosongkan untuk mempertahankan"/>
          <Field label="Masa berlaku (detik)" value={otp.expiry_seconds} onChange={(value) => patch("otp", { expiry_seconds: Number(value) })} type="number" min={60} max={900}/>
          <Field label="Maksimum percobaan" value={otp.max_attempts} onChange={(value) => patch("otp", { max_attempts: Number(value) })} type="number" min={1} max={10}/>
          <label className="block"><span className="block text-sm font-medium mb-1">Template pesan</span><textarea value={otp.message_template} onChange={(e) => patch("otp", { message_template: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg text-sm"/><span className="text-xs text-gray-400">Gunakan {"{{code}}"} dan {"{{expiry_minutes}}"}.</span></label>
          <button disabled={busy !== ""} onClick={() => void save("/otp", { enabled: otp.enabled, provider: otp.provider, expiry_seconds: otp.expiry_seconds, max_attempts: otp.max_attempts, message_template: otp.message_template, ...(otpToken ? { api_token: otpToken } : {}) }, "otp")} className="w-full py-2 bg-primary text-white rounded-lg disabled:opacity-50">Simpan OTP</button>
        </div>
      </Card>

      <Card title="Login dengan Google" badge={google.enabled ? "AKTIF" : "NONAKTIF"}>
        <p className="text-sm text-gray-500 mb-4">ID token Google diverifikasi oleh backend sebelum JWT TukangNDeso diterbitkan.</p>
        <div className="space-y-4">
          <Toggle checked={google.enabled} onChange={(value) => patch("google_auth", { enabled: value })} label="Aktifkan Google Login"/>
          <Field label="Web / Server Client ID" value={google.web_client_id} onChange={(value) => patch("google_auth", { web_client_id: value })} placeholder="...apps.googleusercontent.com"/>
          <Field label="Android Client ID" value={google.android_client_id} onChange={(value) => patch("google_auth", { android_client_id: value })} placeholder="Opsional tetapi direkomendasikan"/>
          <Field label="iOS Client ID" value={google.ios_client_id} onChange={(value) => patch("google_auth", { ios_client_id: value })} placeholder="Opsional"/>
          <button disabled={busy !== ""} onClick={() => void save("/google-auth", google, "google")} className="w-full py-2 bg-primary text-white rounded-lg disabled:opacity-50">Simpan Google Auth</button>
        </div>
      </Card>
    </div>

    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800"><strong>Webhook QRIS:</strong> <code>https://geje.tech/v1/payments/webhook/qris</code>. Mengaktifkan tombol di sini tidak menggantikan aktivasi merchant di dashboard Midtrans atau pembuatan OAuth Client di Google Cloud.</div>
  </div>;
}
