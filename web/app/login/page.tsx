"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/auth/otp/request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      if (json.data?.dev_otp_code) setDevOtp(json.data.dev_otp_code);
      setStep("otp");
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/auth/otp/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      login(json.data.token, json.data.user);
      router.push("/booking");
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl mx-auto flex items-center justify-center">
            <span className="text-white text-2xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary mt-4">Masuk / Daftar</h1>
          <p className="text-gray-500 text-sm mt-1">Gunakan nomor HP untuk melanjutkan</p>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-lg" />
            </div>
            <button onClick={requestOtp} disabled={loading || phone.length < 10}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {loading ? "Mengirim..." : "Kirim OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                placeholder="6 digit" maxLength={6}
                className="w-full px-4 py-3 border rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-primary outline-none" />
              {devOtp && <p className="text-xs text-blue-600 mt-2">Dev OTP: <code className="bg-blue-50 px-2 py-0.5 rounded">{devOtp}</code></p>}
            </div>
            <button onClick={verifyOtp} disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {loading ? "Memverifikasi..." : "Masuk"}
            </button>
            <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">Ubah nomor</button>
          </div>
        )}
      </div>
    </div>
  );
}
