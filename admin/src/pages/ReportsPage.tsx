import React, { useEffect, useState } from 'react';
import { fetchReportSummary } from '../services/api';

export function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Memuat laporan...</p>;

  const workers = summary?.workers ?? {};
  const orders = summary?.orders ?? {};
  const revenue = summary?.revenue ?? {};

  function formatRupiah(amount: number) {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }

  // Calculate completion rate
  const completedOrders = (orders.by_status?.PAID ?? 0) + (orders.by_status?.REVIEWED ?? 0) + (orders.by_status?.COMPLETED ?? 0);
  const cancelledOrders = (orders.by_status?.CANCELLED_BY_CUSTOMER ?? 0) + (orders.by_status?.CANCELLED_BY_WORKER ?? 0);
  const completionRate = orders.total > 0 ? Math.round((completedOrders / orders.total) * 100) : 0;
  const cancellationRate = orders.total > 0 ? Math.round((cancelledOrders / orders.total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Laporan</h1>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>
          🔄 Refresh
        </button>
      </div>

      {/* KPI Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{completionRate}%</div>
          <div className="stat-label">Order Berhasil</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{cancellationRate}%</div>
          <div className="stat-label">Tingkat Pembatalan</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">⭐ {workers.avg_rating ?? 0}</div>
          <div className="stat-label">Rata-rata Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{formatRupiah(revenue.total ?? 0)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      {/* Target vs Actual */}
      <div className="card">
        <div className="card-title">KPI vs Target Pilot</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>KPI</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Order berhasil selesai</td>
                <td>≥80%</td>
                <td>{completionRate}%</td>
                <td>{completionRate >= 80 ? '✅' : '⚠️'}</td>
              </tr>
              <tr>
                <td>Tukang aktif</td>
                <td>≥20</td>
                <td>{workers.active ?? 0}</td>
                <td>{(workers.active ?? 0) >= 20 ? '✅' : '⚠️'}</td>
              </tr>
              <tr>
                <td>Pembatalan pelanggan</td>
                <td>&lt;15%</td>
                <td>{cancellationRate}%</td>
                <td>{cancellationRate < 15 ? '✅' : '⚠️'}</td>
              </tr>
              <tr>
                <td>Rating rata-rata</td>
                <td>≥4.3</td>
                <td>{workers.avg_rating ?? 0}</td>
                <td>{(workers.avg_rating ?? 0) >= 4.3 ? '✅' : '⚠️'}</td>
              </tr>
              <tr>
                <td>Sengketa</td>
                <td>&lt;5%</td>
                <td>{orders.total > 0 ? Math.round(((orders.by_status?.DISPUTED ?? 0) / orders.total) * 100) : 0}%</td>
                <td>{(orders.by_status?.DISPUTED ?? 0) / (orders.total || 1) < 0.05 ? '✅' : '⚠️'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Workers breakdown */}
      <div className="card">
        <div className="card-title">Detail Tukang</div>
        <table>
          <tbody>
            <tr><td>Total Terdaftar</td><td><strong>{workers.total ?? 0}</strong></td></tr>
            <tr><td>Aktif (online bisa terima order)</td><td><strong>{workers.active ?? 0}</strong></td></tr>
            <tr><td>Menunggu Verifikasi</td><td><strong>{workers.pending ?? 0}</strong></td></tr>
            <tr><td>Suspended</td><td><strong>{workers.suspended ?? 0}</strong></td></tr>
          </tbody>
        </table>
      </div>

      {/* Revenue note */}
      <div className="card" style={{ background: '#FFF3CD', border: '1px solid #FFEAA7' }}>
        <div className="card-title" style={{ color: '#856404' }}>⚠️ Catatan Revenue</div>
        <p style={{ color: '#856404' }}>
          Revenue dihitung dari order yang sudah PAID/REVIEWED. Fee platform belum ditetapkan
          (saat ini 100% ke tukang). Setelah fee platform ditetapkan, revenue = fee × total transaksi.
        </p>
      </div>
    </div>
  );
}
