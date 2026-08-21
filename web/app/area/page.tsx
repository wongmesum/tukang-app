const KECAMATAN = [
  "Mojosari", "Bangsal", "Mojoanyar", "Dlanggu", "Puri", "Trowulan",
  "Sooko", "Gedeg", "Kemlagi", "Jetis", "Dawarblandong", "Jatirejo",
  "Gondang", "Pacet", "Trawas", "Ngoro", "Pungging", "Kutorejo",
];

export default function AreaPage() {
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-secondary text-center">Area Layanan</h1>
        <p className="text-gray-500 text-center mt-3 text-lg">Saat ini kami melayani Mojokerto Kabupaten dan sekitarnya</p>

        <div className="mt-12 bg-gradient-to-br from-primary to-orange-400 rounded-2xl p-8 text-white text-center">
          <p className="text-5xl font-bold">25 km</p>
          <p className="mt-2 text-orange-100">Radius layanan dari pusat Mojokerto Kabupaten</p>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Kecamatan yang Dilayani</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {KECAMATAN.map((k) => (
              <div key={k} className="flex items-center gap-2 bg-green-50 rounded-lg px-4 py-3">
                <span className="text-green-500">✓</span>
                <span className="text-sm text-gray-700">{k}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 bg-gray-50 rounded-xl p-8">
          <h2 className="text-xl font-bold text-secondary mb-4">Biaya Perjalanan</h2>
          <div className="space-y-3 text-gray-600">
            <p>• <strong>Rp 1.000/km</strong> dari lokasi tukang ke lokasi Anda</p>
            <p>• Minimum: <strong>Rp 5.000</strong> (jarak &lt; 5 km tetap Rp 5.000)</p>
            <p>• Maksimum: <strong>Rp 50.000</strong></p>
            <p>• Jarak &gt; 25 km: <span className="text-red-500">di luar area layanan</span></p>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <h3 className="font-bold text-blue-800">Ekspansi Segera!</h3>
          <p className="text-blue-700 text-sm mt-2">
            Kota Mojokerto, Jombang, dan Sidoarjo akan segera tersedia. Nantikan update selanjutnya!
          </p>
        </div>
      </div>
    </div>
  );
}
