import React, { useEffect, useState } from 'react';
import { fetchOrders, resolveDispute } from '../services/api';

export function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDisputes();
  }, []);

  async function loadDisputes() {
    setLoading(true);
    try {
      const data = await fetchOrders('DISPUTED');
      setDisputes(data);
    } catch { setDisputes([]); }
    setLoading(false);
  }

  async function handleResolve(orderId: string, refund: boolean) {
    const resolution = prompt('Masukkan catatan resolusi:');
    if (!resolution) return;
    try {
      await resolveDispute(orderId, resolution, refund);
      alert('Dispute berhasil diproses');
      loadDisputes();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Kelola Sengketa (Disputes)</h1>
        <span className="badge badge-disputed">{disputes.length} dispute aktif</span>
      </div>

      <div className="card">
        {loading ? (
          <p>Memuat...</p>
        ) : disputes.length === 0 ? (
          <div className="empty-state">
            <p>🎉 Tidak ada sengketa aktif</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Worker</th>
                  <th>Total</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.customer_id?.slice(0, 8)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.worker_id?.slice(0, 8) ?? '—'}</td>
                    <td>Rp {(o.total_estimate ?? 0).toLocaleString('id-ID')}</td>
                    <td style={{ fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                    <td>
                      <button className="btn btn-success btn-sm" onClick={() => handleResolve(o.id, false)}>
                        Selesaikan
                      </button>
                      {' '}
                      <button className="btn btn-danger btn-sm" onClick={() => handleResolve(o.id, true)}>
                        Refund
                      </button>
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
