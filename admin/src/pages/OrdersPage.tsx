import React, { useEffect, useState } from 'react';
import { fetchOrders } from '../services/api';

const STATUS_OPTIONS = ['', 'PENDING', 'MATCHED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'PAID', 'REVIEWED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_WORKER', 'DISPUTED', 'EXPIRED'];

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await fetchOrders(statusFilter || undefined);
      setOrders(data);
    } catch { setOrders([]); }
    setLoading(false);
  }

  function formatRupiah(amount: number) {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Monitor Orders</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <p>Memuat...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>Tidak ada order {statusFilter ? `dengan status ${statusFilter}` : ''}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Worker</th>
                  <th>Total</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                    <td>
                      <span className={`badge badge-${o.status.toLowerCase().includes('cancel') || o.status === 'DISPUTED' ? 'suspended' : o.status === 'PAID' || o.status === 'REVIEWED' ? 'paid' : o.status === 'COMPLETED' ? 'completed' : 'active'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.customer_id?.slice(0, 8)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.worker_id?.slice(0, 8) ?? '—'}</td>
                    <td>{formatRupiah(o.total_estimate)}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(o.created_at)}</td>
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
