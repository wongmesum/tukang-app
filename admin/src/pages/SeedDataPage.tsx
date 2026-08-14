import React, { useEffect, useState } from 'react';
import { fetchAdminCategories, createCategory, updateCategory, deleteCategory, fetchAdminServices, createService, updateService, deleteService } from '../services/api';

export function SeedDataPage() {
  return (
    <div>
      <div className="page-header">
        <h1>🌱 Seed Data</h1>
        <span style={{ color: 'var(--text-secondary)' }}>Kelola kategori & layanan</span>
      </div>

      <CategoriesSection />
      <ServicesSection />
    </div>
  );
}

// --- Categories ---
function CategoriesSection() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', icon_url: '', is_active: true });

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await fetchAdminCategories();
      setCategories(data);
    } catch { setCategories([]); }
    setLoading(false);
  }

  function resetForm() {
    setForm({ code: '', name: '', icon_url: '', is_active: true });
    setEditCode(null);
    setShowForm(false);
  }

  function startEdit(cat: any) {
    setForm({ code: cat.code, name: cat.name, icon_url: cat.icon_url ?? '', is_active: cat.is_active });
    setEditCode(cat.code);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editCode) {
        await updateCategory(editCode, { name: form.name, icon_url: form.icon_url || undefined, is_active: form.is_active });
      } else {
        await createCategory({ code: form.code, name: form.name, icon_url: form.icon_url || undefined, is_active: form.is_active });
      }
      resetForm();
      loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(code: string) {
    if (!confirm(`Hapus kategori ${code}? Semua layanan di kategori ini juga akan dihapus.`)) return;
    try {
      await deleteCategory(code);
      loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="card-title" style={{ margin: 0 }}>📂 Kategori Layanan</div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? '✕ Tutup' : '+ Tambah Kategori'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="seed-form">
          <div className="form-row">
            <div className="form-group">
              <label>Kode (max 10 char)</label>
              <input
                type="text"
                placeholder="AC"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                maxLength={10}
                disabled={!!editCode}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nama Kategori</label>
              <input
                type="text"
                placeholder="AC & Pendingin"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Icon URL (opsional)</label>
              <input
                type="text"
                placeholder="https://..."
                value={form.icon_url}
                onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Aktif
              </label>
            </div>
          </div>
          <button type="submit" className="btn btn-success">{editCode ? 'Update' : 'Simpan'}</button>
          {editCode && <button type="button" className="btn btn-outline" onClick={resetForm} style={{ marginLeft: 8 }}>Batal</button>}
        </form>
      )}

      {loading ? <p>Memuat...</p> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.code}>
                  <td><code>{c.code}</code></td>
                  <td>{c.name}</td>
                  <td><span className={`badge badge-${c.is_active ? 'active' : 'suspended'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => startEdit(c)}>Edit</button>
                    {' '}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.code)}>Hapus</button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada kategori</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Services ---
function ServicesSection() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState({
    category_code: '', name: '', description: '',
    base_hourly_rate: 30000, base_daily_rate: 150000, min_hours: 2, is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [svc, cats] = await Promise.all([fetchAdminServices(), fetchAdminCategories()]);
      setServices(svc);
      setCategories(cats);
    } catch { }
    setLoading(false);
  }

  function resetForm() {
    setForm({ category_code: '', name: '', description: '', base_hourly_rate: 30000, base_daily_rate: 150000, min_hours: 2, is_active: true });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(svc: any) {
    setForm({
      category_code: svc.category_code,
      name: svc.name,
      description: svc.description ?? '',
      base_hourly_rate: svc.base_hourly_rate,
      base_daily_rate: svc.base_daily_rate,
      min_hours: svc.min_hours,
      is_active: svc.is_active,
    });
    setEditId(svc.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await updateService(editId, {
          name: form.name,
          description: form.description || undefined,
          base_hourly_rate: form.base_hourly_rate,
          base_daily_rate: form.base_daily_rate,
          min_hours: form.min_hours,
          is_active: form.is_active,
        });
      } else {
        await createService(form);
      }
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus layanan ini?')) return;
    try {
      await deleteService(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filteredServices = filterCategory
    ? services.filter((s) => s.category_code === filterCategory)
    : services;

  function formatRupiah(n: number) { return `Rp ${n.toLocaleString('id-ID')}`; }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="card-title" style={{ margin: 0 }}>🔧 Daftar Layanan ({filteredServices.length})</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <option value="">Semua Kategori</option>
            {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? '✕ Tutup' : '+ Tambah Layanan'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="seed-form">
          <div className="form-row">
            <div className="form-group">
              <label>Kategori</label>
              <select value={form.category_code} onChange={(e) => setForm({ ...form, category_code: e.target.value })} required disabled={!!editId}>
                <option value="">Pilih...</option>
                {categories.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Nama Layanan</label>
              <input type="text" placeholder="Cuci AC Split" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Deskripsi (opsional)</label>
              <input type="text" placeholder="Deskripsi singkat..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tarif/Jam (Rp)</label>
              <input type="number" value={form.base_hourly_rate} onChange={(e) => setForm({ ...form, base_hourly_rate: Number(e.target.value) })} min={0} step={1000} />
            </div>
            <div className="form-group">
              <label>Tarif/Hari (Rp)</label>
              <input type="number" value={form.base_daily_rate} onChange={(e) => setForm({ ...form, base_daily_rate: Number(e.target.value) })} min={0} step={1000} />
            </div>
            <div className="form-group">
              <label>Min Jam</label>
              <input type="number" value={form.min_hours} onChange={(e) => setForm({ ...form, min_hours: Number(e.target.value) })} min={1} max={8} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif
            </label>
            <button type="submit" className="btn btn-success">{editId ? 'Update' : 'Simpan'}</button>
            {editId && <button type="button" className="btn btn-outline" onClick={resetForm}>Batal</button>}
          </div>
        </form>
      )}

      {loading ? <p>Memuat...</p> : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Layanan</th>
                <th>Tarif/Jam</th>
                <th>Tarif/Hari</th>
                <th>Min</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.category_code}</code></td>
                  <td><strong>{s.name}</strong>{s.description && <><br/><small style={{ color: 'var(--text-secondary)' }}>{s.description}</small></>}</td>
                  <td>{formatRupiah(s.base_hourly_rate)}</td>
                  <td>{formatRupiah(s.base_daily_rate)}</td>
                  <td>{s.min_hours}j</td>
                  <td><span className={`badge badge-${s.is_active ? 'active' : 'suspended'}`}>{s.is_active ? 'Aktif' : 'Off'}</span></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => startEdit(s)}>Edit</button>
                    {' '}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Belum ada layanan{filterCategory ? ` untuk kategori ${filterCategory}` : ''}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
