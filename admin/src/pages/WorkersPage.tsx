import React, { useEffect, useState } from 'react';
import { fetchAllWorkers, fetchPendingWorkers, verifyWorker, suspendWorker, reactivateWorker } from '../services/api';

export function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
  }, [tab]);

  async function loadWorkers() {
    setLoading(true);
    try {
      const data = tab === 'pending' ? await fetchPendingWorkers() : await fetchAllWorkers();
      setWorkers(data);
    } catch { setWorkers([]); }
    setLoading(false);
  }

  async function handleVerify(userId: string) {
    if (!confirm('Verifikasi tukang ini?')) return;
    await verifyWorker(userId);
    loadWorkers();
  }

  async function handleSuspend(userId: string) {
    if (!confirm('Suspend tukang ini?')) return;
    await suspendWorker(userId);
    loadWorkers();
  }

  async function handleReactivate(userId: string) {
    if (!confirm('Aktifkan kembali tukang ini?')) return;
    await reactivateWorker(userId);
    loadWorkers();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Kelola Tukang</h1>
        <div>
          <button className={`btn ${tab === 'pending' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('pending')}>
            Menunggu Verifikasi
          </button>
          {' '}
          <button className={`btn ${tab === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('all')}>
            Semua Tukang
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Memuat...</p>
        ) : workers.length === 0 ? (
          <div className="empty-state">
            <p>Tidak ada tukang {tab === 'pending' ? 'yang menunggu verifikasi' : ''}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  {tab === 'pending' && <th>KTP</th>}
                  <th>Keahlian</th>
                  {tab === 'all' && <th>Status</th>}
                  {tab === 'all' && <th>Rating</th>}
                  {tab === 'all' && <th>Orders</th>}
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.user_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{w.user_id?.slice(0, 8)}...</td>
                    {tab === 'pending' && <td>{w.ktp_number}</td>}
                    <td>{(w.skills ?? []).join(', ')}</td>
                    {tab === 'all' && (
                      <td>
                        <span className={`badge badge-${w.status}`}>{w.status}</span>
                      </td>
                    )}
                    {tab === 'all' && <td>⭐ {w.rating_avg}</td>}
                    {tab === 'all' && <td>{w.total_orders}</td>}
                    <td>
                      {(tab === 'pending' || w.status === 'pending') && (
                        <button className="btn btn-success btn-sm" onClick={() => handleVerify(w.user_id)}>
                          ✓ Verifikasi
                        </button>
                      )}
                      {' '}
                      {w.status === 'active' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleSuspend(w.user_id)}>
                          Suspend
                        </button>
                      )}
                      {w.status === 'suspended' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleReactivate(w.user_id)}>
                          Aktifkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
