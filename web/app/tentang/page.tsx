export default function TentangPage() {
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-secondary text-center">Tentang TukangNDeso</h1>
        <p className="text-gray-500 text-center mt-3 text-lg">Marketplace jasa tukang untuk Mojokerto Kabupaten</p>

        <div className="mt-16 space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-secondary mb-4">Siapa Kami?</h2>
            <p className="text-gray-600 leading-relaxed">
              TukangNDeso adalah platform marketplace yang menghubungkan pelanggan dengan tukang terdekat di wilayah Mojokerto Kabupaten, Jawa Timur. Kami percaya setiap orang berhak mendapatkan layanan tukang yang profesional, transparan, dan terjangkau — tanpa harus ribet negosiasi atau cari-cari sendiri.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-secondary mb-4">Visi</h2>
            <p className="text-gray-600 leading-relaxed">
              Menjadi platform jasa tukang terpercaya yang memberdayakan tukang lokal dan memudahkan masyarakat mendapatkan layanan rumah tangga berkualitas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-secondary mb-4">Misi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Menyediakan harga transparan tanpa negosiasi ribet",
                "Memberdayakan tukang lokal dengan penghasilan stabil",
                "Menjamin kualitas melalui rating dan verifikasi",
                "Mempermudah pembayaran dengan QRIS",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-orange-50 rounded-lg p-4">
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">{i + 1}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-secondary mb-4">Keunggulan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: "👁️", title: "Transparan", desc: "Harga breakdown terlihat sebelum booking" },
                { icon: "📍", title: "Terdekat", desc: "Matching berbasis lokasi, tukang datang cepat" },
                { icon: "⏱️", title: "Fleksibel", desc: "Per jam untuk kerjaan kecil, harian untuk proyek" },
                { icon: "✅", title: "Terjamin", desc: "Tukang terverifikasi KTP + rating dari pelanggan" },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold text-secondary">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
