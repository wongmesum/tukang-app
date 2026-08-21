"use client";

import { useState, useEffect, useCallback } from "react";

interface ServiceItem {
  id: string;
  category_code: string;
  name: string;
  description: string | null;
  base_hourly_rate: number;
  base_daily_rate: number;
  min_hours: number;
  is_active: boolean;
}

interface Category {
  code: string;
  name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";
function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : "";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formHourly, setFormHourly] = useState(30000);
  const [formDaily, setFormDaily] = useState(150000);
  const [formMinHours, setFormMinHours] = useState(2);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = filter ? `?category=${filter}` : "";
      const [svcRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/admin/services${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/categories`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const svcJson = await svcRes.json();
      const catJson = await catRes.json();
      if (!svcJson.success) throw new Error(svcJson.error?.message);
      setServices(svcJson.data);
      if (catJson.success) setCategories(catJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openAdd() {
    setEditId(null);
    setFormCategory(filter || (categories[0]?.code ?? ""));
    setFormName("");
    setFormDesc("");
    setFormHourly(30000);
    setFormDaily(150000);
    setFormMinHours(2);
    setShowForm(true);
  }

  function openEdit(svc: ServiceItem) {
    setEditId(svc.id);
    setFormCategory(svc.category_code);
    setFormName(svc.name);
    setFormDesc(svc.description ?? "");
    setFormHourly(svc.base_hourly_rate);
    setFormDaily(svc.base_daily_rate);
    setFormMinHours(svc.min_hours);
    setShowForm(true);
  }

  async function handleSubmit() {
    const token = getToken();
    try {
      if (editId) {
        const res = await fetch(`${API_BASE}/admin/services/${editId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            description: formDesc || null,
            base_hourly_rate: formHourly,
            base_daily_rate: formDaily,
            min_hours: formMinHours,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message);
      } else {
        if (!formName.trim()) { alert("Nama layanan wajib diisi"); return; }
        const res = await fetch(`${API_BASE}/admin/services`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            category_code: formCategory,
            name: formName,
            description: formDesc || null,
            base_hourly_rate: formHourly,
            base_daily_rate: formDaily,
            min_hours: formMinHours,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message);
      }
      setShowForm(false);
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/services/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">Layanan & Tarif</h1>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
          <button onClick={openAdd} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600">
            + Tambah Layanan
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">{error}</div>}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <h2 className="text-lg font-semibold mb-4">{editId ? "Edit Layanan" : "Tambah Layanan Baru"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                disabled={!!editId}
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100"
              >
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Layanan</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Cuci AC Split" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (opsional)</label>
              <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Keterangan layanan..." className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarif Per Jam (Rp)</label>
              <input type="number" value={formHourly} onChange={(e) => setFormHourly(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarif Per Hari (Rp)</label>
              <input type="number" value={formDaily} onChange={(e) => setFormDaily(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Jam</label>
              <input type="number" value={formMinHours} onChange={(e) => setFormMinHours(Number(e.target.value))} min={1} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600">
              {editId ? "Simpan Perubahan" : "Tambah Layanan"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada layanan</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Kategori</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nama Layanan</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Per Jam</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Per Hari</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Min Jam</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{svc.category_code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{svc.name}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(svc.base_hourly_rate)}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">{formatCurrency(svc.base_daily_rate)}</td>
                  <td className="px-4 py-3 text-sm text-center">{svc.min_hours}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${svc.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                      {svc.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(svc)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Edit</button>
                      <button
                        onClick={() => toggleActive(svc.id, svc.is_active)}
                        className={`px-2 py-1 text-xs rounded text-white ${svc.is_active ? "bg-gray-500 hover:bg-gray-600" : "bg-green-500 hover:bg-green-600"}`}
                      >
                        {svc.is_active ? "Off" : "On"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
