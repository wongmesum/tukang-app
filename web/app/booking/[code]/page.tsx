"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface Service {
  id: string;
  name: string;
  description: string | null;
  base_hourly_rate: number;
  base_daily_rate: number;
  min_hours: number;
}

export default function ServiceListPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const categoryName = searchParams.get("name") ?? code;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Service[]>(`/categories/${code}/services`)
      .then(setServices).catch(() => {}).finally(() => setLoading(false));
  }, [code, apiFetch]);

  function selectService(svc: Service) {
    const data = encodeURIComponent(JSON.stringify(svc));
    router.push(`/booking/form?service=${data}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button onClick={() => router.back()} className="text-gray-500 hover:text-primary text-sm mb-4">← Kembali</button>
      <h1 className="text-2xl font-bold text-secondary">{categoryName}</h1>
      <p className="text-gray-500 mt-1">Pilih jenis layanan</p>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Tidak ada layanan tersedia</div>
      ) : (
        <div className="space-y-3 mt-6">
          {services.map((svc) => (
            <button key={svc.id} onClick={() => selectService(svc)}
              className="w-full bg-white rounded-xl border p-5 hover:border-primary hover:shadow transition-all text-left flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-secondary">{svc.name}</h3>
                {svc.description && <p className="text-sm text-gray-500 mt-1">{svc.description}</p>}
                <p className="text-sm text-primary font-medium mt-2">
                  Rp {svc.base_hourly_rate.toLocaleString("id-ID")}/jam &middot; Rp {svc.base_daily_rate.toLocaleString("id-ID")}/hari
                </p>
              </div>
              <span className="text-gray-300 text-xl">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
