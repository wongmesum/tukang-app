"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Gagal kirim OTP");
      // In dev mode, the API returns the OTP code
      if (json.data?.dev_otp_code) {
        setDevOtp(json.data.dev_otp_code);
      }
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "OTP salah");

      const { token, user } = json.data;

      // Verify user is admin
      if (user.role !== "admin") {
        throw new Error("Akun ini bukan admin. Akses ditolak.");
      }

      localStorage.setItem("admin_token", token);
      localStorage.setItem("admin_user", JSON.stringify(user));
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">TukangNDeso</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Panel Login</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP Admin</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <button
              onClick={requestOtp}
              disabled={loading || phone.length < 10}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Mengirim..." : "Kirim OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6 digit kode"
                maxLength={6}
                className="w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
              {devOtp && (
                <p className="text-xs text-blue-600 mt-1">Dev OTP: <code className="bg-blue-50 px-1 rounded">{devOtp}</code></p>
              )}
            </div>
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Memverifikasi..." : "Login"}
            </button>
            <button
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-700"
            >
              Ubah nomor HP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
