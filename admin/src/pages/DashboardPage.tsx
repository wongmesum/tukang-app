import React, { useEffect, useState } from 'react';
import { fetchReportSummary } from '../services/api';

export function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Memuat...</p>;

  const workers = summary?.workers ?? {};
  const orders = summary?.orders ?? {};
  const revenue = summary?.revenue ?? {};

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span style={{ color: 'var(--text-secondary)' }}>Ringkasan real-time</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{workers.active ?? 0}</div>
          <div className="stat-label">Tukang Aktif</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{workers.pending ?? 0}</div>
          <div className="stat-label">Menunggu Verifikasi</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--info)' }}>{orders.total ?? 0}</div>
          <div className="stat-label">Total Order</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            Rp {((revenue.total ?? 0) / 1000).toFixed(0)}K
          </div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Order per Status</div>
        {orders.by_status ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(orders.by_status).map(([status, count]) => (
                  <tr key={status}>
                    <td><span className={`badge badge-${status.toLowerCase().includes('cancel') ? 'suspended' : status.toLowerCase().includes('paid') ? 'paid' : 'active'}`}>{status}</span></td>
                    <td>{count as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Belum ada data</p>
        )}
      </div>

      <div className="card">
        <div className="card-title">Ringkasan Tukang</div>
        <table>
          <tbody>
            <tr><td>Total Terdaftar</td><td><strong>{workers.total ?? 0}</strong></td></tr>
            <tr><td>Aktif</td><td><strong style={{ color: 'var(--success)' }}>{workers.active ?? 0}</strong></td></tr>
            <tr><td>Menunggu Verifikasi</td><td><strong style={{ color: 'var(--warning)' }}>{workers.pending ?? 0}</strong></td></tr>
            <tr><td>Suspended</td><td><strong style={{ color: 'var(--danger)' }}>{workers.suspended ?? 0}</strong></td></tr>
            <tr><td>Rata-rata Rating</td><td><strong>⭐ {workers.avg_rating ?? 0}</strong></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
