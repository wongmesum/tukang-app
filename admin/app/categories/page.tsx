"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
  code: string;
  name: string;
  iconUrl: string | null;
  isActive: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/v1";
function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("admin_token") ?? "" : "";
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setCategories(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function openAdd() {
    setEditCode(null);
    setFormCode("");
    setFormName("");
    setFormIcon("");
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditCode(cat.code);
    setFormCode(cat.code);
    setFormName(cat.name);
    setFormIcon(cat.iconUrl ?? "");
    setShowForm(true);
  }

  async function handleSubmit() {
    const token = getToken();
    try {
      if (editCode) {
        // Update
        const res = await fetch(`${API_BASE}/admin/categories/${editCode}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, icon_url: formIcon || null }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message);
      } else {
        // Create
        if (!formCode.trim()) { alert("Kode wajib diisi"); return; }
        const res = await fetch(`${API_BASE}/admin/categories`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ code: formCode, name: formName, icon_url: formIcon || null }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message);
      }
      setShowForm(false);
      await fetchCategories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan");
    }
  }

  async function toggleActive(code: string, currentActive: boolean) {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/admin/categories/${code}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      await fetchCategories();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary">Kategori Layanan</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600"
        >
          + Tambah Kategori
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700">{error}</div>}

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <h2 className="text-lg font-semibold mb-4">{editCode ? "Edit Kategori" : "Tambah Kategori Baru"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                disabled={!!editCode}
                maxLength={10}
                placeholder="AC, BGN, LST..."
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="AC & Pendingin"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon URL (opsional)</label>
              <input
                type="text"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-orange-600">
              {editCode ? "Simpan Perubahan" : "Tambah"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Icon</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat) => (
                <tr key={cat.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-bold">{cat.code}</td>
                  <td className="px-4 py-3 text-sm">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-[150px]">{cat.iconUrl ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                      {cat.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(cat)} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Edit</button>
                      <button
                        onClick={() => toggleActive(cat.code, cat.isActive)}
                        className={`px-2 py-1 text-xs rounded text-white ${cat.isActive ? "bg-gray-500 hover:bg-gray-600" : "bg-green-500 hover:bg-green-600"}`}
                      >
                        {cat.isActive ? "Nonaktifkan" : "Aktifkan"}
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
