import React, { useState } from 'react';

export function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Pengaturan</h1>
        <span style={{ color: 'var(--text-secondary)' }}>Konfigurasi layanan pihak ketiga</span>
      </div>

      <FirebaseSection />
      <MidtransSection />
      <GoogleMapsSection />
    </div>
  );
}

// --- Firebase Section ---
function FirebaseSection() {
  const [projectId, setProjectId] = useState(localStorage.getItem('cfg_firebase_project_id') ?? '');
  const [clientEmail, setClientEmail] = useState(localStorage.getItem('cfg_firebase_client_email') ?? '');
  const [privateKey, setPrivateKey] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem('cfg_firebase_project_id', projectId);
    localStorage.setItem('cfg_firebase_client_email', clientEmail);
    if (privateKey) localStorage.setItem('cfg_firebase_private_key', '***configured***');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="card">
      <div className="card-title">🔥 Firebase Cloud Messaging (FCM)</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Push notification untuk order status ke customer & worker.
      </p>

      <div className="settings-guide">
        <h4>Panduan Setup:</h4>
        <ol>
          <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Firebase Console</a></li>
          <li>Klik <strong>"Add Project"</strong> → beri nama "TukangNDeso"</li>
          <li>Aktifkan <strong>Cloud Messaging</strong> di menu sidebar</li>
          <li>Buka <strong>Project Settings → Service Accounts</strong></li>
          <li>Klik <strong>"Generate New Private Key"</strong> → download JSON</li>
          <li>Dari file JSON, salin:
            <ul>
              <li><code>project_id</code> → Project ID di bawah</li>
              <li><code>client_email</code> → Client Email</li>
              <li><code>private_key</code> → Private Key</li>
            </ul>
          </li>
          <li>Untuk mobile app:
            <ul>
              <li><strong>Android:</strong> Project Settings → Add App → Android → download <code>google-services.json</code> → taruh di <code>app/android/app/</code></li>
              <li><strong>iOS:</strong> Project Settings → Add App → iOS → download <code>GoogleService-Info.plist</code> → taruh di <code>app/ios/Runner/</code></li>
            </ul>
          </li>
        </ol>
      </div>

      <div className="form-group">
        <label>Firebase Project ID</label>
        <input
          type="text"
          placeholder="tukangndeso-xxxxx"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Client Email (Service Account)</label>
        <input
          type="email"
          placeholder="firebase-adminsdk-xxxxx@tukangndeso.iam.gserviceaccount.com"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Private Key (dari service account JSON)</label>
        <textarea
          placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          rows={4}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
        <small style={{ color: 'var(--text-secondary)' }}>
          ⚠️ Set sebagai environment variable <code>FIREBASE_PRIVATE_KEY</code> di server. Jangan commit ke git.
        </small>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave}>Simpan Konfigurasi</button>
        {saved && <span style={{ color: 'var(--success)' }}>✓ Tersimpan</span>}
      </div>

      <div className="env-block">
        <h4>Environment Variables (set di server .env):</h4>
        <pre>{`FIREBASE_PROJECT_ID="${projectId}"
FIREBASE_CLIENT_EMAIL="${clientEmail}"
FIREBASE_PRIVATE_KEY="<isi dari JSON>"
`}</pre>
      </div>
    </div>
  );
}

// --- Midtrans Section ---
function MidtransSection() {
  const [serverKey, setServerKey] = useState(localStorage.getItem('cfg_midtrans_server_key') ?? '');
  const [clientKey, setClientKey] = useState(localStorage.getItem('cfg_midtrans_client_key') ?? '');
  const [isProduction, setIsProduction] = useState(localStorage.getItem('cfg_midtrans_production') === 'true');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem('cfg_midtrans_server_key', serverKey);
    localStorage.setItem('cfg_midtrans_client_key', clientKey);
    localStorage.setItem('cfg_midtrans_production', String(isProduction));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="card">
      <div className="card-title">💳 Midtrans QRIS</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Pembayaran QRIS dynamic — customer scan QR, bayar pakai app apapun.
      </p>

      <div className="settings-guide">
        <h4>Panduan Setup:</h4>
        <ol>
          <li>Buka <a href="https://dashboard.sandbox.midtrans.com/" target="_blank" rel="noreferrer">Midtrans Dashboard (Sandbox)</a></li>
          <li>Daftar / Login → pilih <strong>Sandbox Environment</strong></li>
          <li>Buka <strong>Settings → Access Keys</strong></li>
          <li>Salin <strong>Server Key</strong> dan <strong>Client Key</strong></li>
          <li>Buka <strong>Settings → Payment → QRIS</strong> → klik <strong>Activate</strong></li>
          <li>Set <strong>Payment Notification URL</strong> ke: <code>https://api.tukangndeso.id/v1/payments/webhook/qris</code></li>
          <li>Untuk production: apply melalui <a href="https://dashboard.midtrans.com/" target="_blank" rel="noreferrer">dashboard production</a> (butuh dokumen badan usaha)</li>
        </ol>
      </div>

      <div className="form-group">
        <label>Server Key</label>
        <input
          type="text"
          placeholder="SB-Mid-server-xxxxxxxxxxxxxxxx"
          value={serverKey}
          onChange={(e) => setServerKey(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Client Key</label>
        <input
          type="text"
          placeholder="SB-Mid-client-xxxxxxxxxxxxxxxx"
          value={clientKey}
          onChange={(e) => setClientKey(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={isProduction}
            onChange={(e) => setIsProduction(e.target.checked)}
          />
          Mode Production (centang hanya setelah approved oleh Midtrans)
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave}>Simpan Konfigurasi</button>
        {saved && <span style={{ color: 'var(--success)' }}>✓ Tersimpan</span>}
      </div>

      <div className="env-block">
        <h4>Environment Variables (set di server .env):</h4>
        <pre>{`MIDTRANS_SERVER_KEY="${serverKey}"
MIDTRANS_CLIENT_KEY="${clientKey}"
MIDTRANS_IS_PRODUCTION=${isProduction}
QRIS_WEBHOOK_SECRET="<buat random secret untuk verifikasi>"
`}</pre>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#E8F5E9', borderRadius: 8 }}>
        <strong>💡 Biaya QRIS:</strong> MDR 0.7% per transaksi (ditanggung platform di fase pilot).
        Untuk order Rp 100rb = fee Rp 700.
      </div>
    </div>
  );
}

// --- Google Maps Section ---
function GoogleMapsSection() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('cfg_google_maps_key') ?? '');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem('cfg_google_maps_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="card">
      <div className="card-title">🗺️ Google Maps</div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Peta lokasi, jarak tukang-pelanggan, dan navigasi.
      </p>

      <div className="settings-guide">
        <h4>Panduan Setup:</h4>
        <ol>
          <li>Buka <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a></li>
          <li>Buat project baru atau pilih project Firebase yang sama</li>
          <li>Buka <strong>APIs & Services → Library</strong></li>
          <li>Enable API berikut:
            <ul>
              <li>✅ <strong>Maps SDK for Android</strong></li>
              <li>✅ <strong>Maps SDK for iOS</strong></li>
              <li>✅ <strong>Directions API</strong> (untuk rute navigasi)</li>
              <li>✅ <strong>Geocoding API</strong> (untuk alamat → koordinat)</li>
              <li>✅ <strong>Places API</strong> (opsional, untuk autocomplete alamat)</li>
            </ul>
          </li>
          <li>Buka <strong>APIs & Services → Credentials</strong></li>
          <li>Klik <strong>"Create Credentials" → API Key</strong></li>
          <li>Restrict key:
            <ul>
              <li>Android: restrict ke package <code>id.tukangndeso.app</code></li>
              <li>iOS: restrict ke bundle ID</li>
              <li>Backend: restrict ke IP server</li>
            </ul>
          </li>
          <li>Salin API Key ke form di bawah</li>
        </ol>
      </div>

      <div className="form-group">
        <label>Google Maps API Key</label>
        <input
          type="text"
          placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave}>Simpan Konfigurasi</button>
        {saved && <span style={{ color: 'var(--success)' }}>✓ Tersimpan</span>}
      </div>

      <div className="env-block">
        <h4>Konfigurasi di project:</h4>
        <pre>{`# Backend (.env)
GOOGLE_MAPS_API_KEY="${apiKey}"

# Android (android/app/local.properties)
GOOGLE_MAPS_API_KEY=${apiKey}

# iOS (ios/Runner/AppDelegate.swift)
GMSServices.provideAPIKey("${apiKey}")
`}</pre>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#FFF3E0', borderRadius: 8 }}>
        <strong>💡 Estimasi biaya:</strong> Google Maps SDK gratis untuk mobile. Directions API: $5/1000 requests.
        Geocoding: $5/1000 requests. Budget awal ~Rp 300.000-1.000.000/bulan tergantung volume.
      </div>
    </div>
  );
}
