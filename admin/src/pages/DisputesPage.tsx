import React, { useEffect, useState } from 'react';
import { fetchDisputes, resolveDisputeById } from '../services/api';

type Tab = 'open' | 'resolved';

export function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('open');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<any | null>(null);

  useEffect(() => {
    loadDisputes();
  }, [tab]);

  async function loadDisputes() {
    setLoading(true);
    try {
      const data = await fetchDisputes(tab);
      setDisputes(data);
    } catch {
      setDisputes([]);
    }
    setLoading(false);
  }

  function formatRupiah(n: number | null) {
    if (n === null || n === undefined) return '—';
    return `Rp ${n.toLocaleString('id-ID')}`;
  }

  return (
    <div>
      <div className="page-header">
        <h1>⚠️ Kelola Sengketa</h1>
        <div>
          <button
            className={`btn ${tab === 'open' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('open')}
          >
            Terbuka
          </button>{' '}
          <button
            className={`btn ${tab === 'resolved' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('resolved')}
          >
            Selesai
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card"><p>Memuat...</p></div>
      ) : disputes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p>{tab === 'open' ? '🎉 Tidak ada sengketa terbuka' : 'Belum ada sengketa yang diselesaikan'}</p>
          </div>
        </div>
      ) : (
        disputes.map((d) => (
          <div className="card" key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div className="card-title" style={{ marginBottom: 4 }}>
                  {d.order?.order_number ?? d.order_id.slice(0, 8)}
                </div>
                <span className={`badge badge-${d.filed_by_role === 'customer' ? 'paid' : 'pending'}`}>
                  Dilaporkan oleh {d.filed_by_role === 'customer' ? 'Pelanggan' : 'Tukang'}
                </span>{' '}
                <span className={`badge badge-${d.status === 'open' ? 'disputed' : 'active'}`}>
                  {d.status === 'open' ? 'Terbuka' : 'Selesai'}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
                {new Date(d.created_at).toLocaleString('id-ID')}
              </div>
            </div>

            {/* The reason is the whole point — show it prominently */}
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: '#FFF8F0',
                borderLeft: '4px solid var(--warning)',
                borderRadius: 4,
              }}
            >
              <strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Alasan:</strong>
              <p style={{ marginTop: 4 }}>{d.reason}</p>
            </div>

            {d.photos?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Bukti ({d.photos.length} foto):
                </strong>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {d.photos.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt={`Bukti ${i + 1}`}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="table-container" style={{ marginTop: 16 }}>
              <table>
                <tbody>
                  <tr>
                    <td style={{ width: 180 }}>Status Order</td>
                    <td><span className="badge badge-suspended">{d.order?.status ?? '—'}</span></td>
                  </tr>
                  <tr>
                    <td>Nilai Order</td>
                    <td>{formatRupiah(d.order?.total_final ?? d.order?.total_estimate)}</td>
                  </tr>
                  <tr>
                    <td>Pelanggan</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {d.order?.customer_id?.slice(0, 8) ?? '—'}
                    </td>
                  </tr>
                  <tr>
                    <td>Tukang</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {d.order?.worker_id?.slice(0, 8) ?? '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {d.status === 'resolved' ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#E8F5E9',
                  borderRadius: 6,
                }}
              >
                <strong style={{ fontSize: 13 }}>Resolusi:</strong>
                <p style={{ marginTop: 4 }}>{d.resolution}</p>
                {d.refunded && <span className="badge badge-paid">Direfund</span>}
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => setResolving(d)}>
                  Selesaikan Sengketa
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {resolving && (
        <ResolveModal
          dispute={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => {
            setResolving(null);
            loadDisputes();
          }}
        />
      )}
    </div>
  );
}

function ResolveModal({
  dispute,
  onClose,
  onResolved,
}: {
  dispute: any;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [resolution, setResolution] = useState('');
  const [refund, setRefund] = useState(false);
  const [finalStatus, setFinalStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await resolveDisputeById(dispute.id, {
        resolution,
        refund,
        ...(finalStatus ? { final_status: finalStatus } : {}),
      });
      onResolved();
    } catch (err: any) {
      setError(err.message ?? 'Gagal menyelesaikan sengketa');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 520, margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-title">
          Selesaikan Sengketa — {dispute.order?.order_number ?? ''}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Catatan Resolusi</label>
            <textarea
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Jelaskan keputusan dan alasannya..."
              required
              minLength={5}
            />
          </div>

          <div className="form-group">
            <label>Status Akhir Order (opsional)</label>
            <select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)}>
              <option value="">Biarkan DISPUTED (masih negosiasi)</option>
              <option value="PAID">PAID — pekerjaan sah, tukang dibayar</option>
              <option value="REVIEWED">REVIEWED — selesai tuntas</option>
              <option value="CANCELLED_BY_CUSTOMER">CANCELLED — dibatalkan, pelanggan dipulihkan</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={refund}
                onChange={(e) => setRefund(e.target.checked)}
              />
              Refund pembayaran yang sudah lunas
            </label>
          </div>

          {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-success" disabled={submitting}>
              {submitting ? 'Memproses...' : 'Simpan Resolusi'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
