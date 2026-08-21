import Link from "next/link";

const CATEGORIES = [
  { code: "AC", name: "AC & Pendingin", icon: "🧊", desc: "Pasang, cuci, isi freon, perbaikan" },
  { code: "BGN", name: "Bangunan", icon: "🧱", desc: "Renovasi, plester, keramik, atap" },
  { code: "LST", name: "Listrik", icon: "⚡", desc: "Instalasi, perbaikan, tambah daya" },
  { code: "PLB", name: "Plumbing", icon: "🔧", desc: "Saluran mampet, pipa, pompa" },
  { code: "LAS", name: "Las & Besi", icon: "🔩", desc: "Pagar, kanopi, teralis, railing" },
  { code: "TKY", name: "Tukang Kayu", icon: "🪵", desc: "Kusen, lemari, plafon, partisi" },
];

const STEPS = [
  { num: "1", title: "Pilih Layanan", desc: "Pilih kategori dan jenis pekerjaan yang dibutuhkan" },
  { num: "2", title: "Lihat Harga", desc: "Estimasi harga transparan sebelum booking, tanpa negosiasi" },
  { num: "3", title: "Tukang Datang", desc: "Tukang terdekat terverifikasi datang ke lokasi Anda" },
  { num: "4", title: "Bayar & Review", desc: "Bayar via QRIS setelah selesai, beri rating" },
];

const TESTIMONIALS = [
  { name: "Ibu Sari", area: "Mojosari", text: "AC saya bermasalah 2 hari, lewat app ini langsung dapat tukang dalam 30 menit. Harga jelas di depan." },
  { name: "Pak Dwi", area: "Trowulan", text: "Renovasi kamar mandi, booking tukang harian. Kerja rapi, bisa dipantau dari HP." },
  { name: "Mbak Rina", area: "Sooko", text: "Saluran mampet malam-malam, ada surcharge tapi ditulis jelas. Tukang datang cepat." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-white py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-secondary leading-tight">
              Tukang Profesional<br />
              <span className="text-primary">di Ujung Jari</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
              Cari dan booking tukang terverifikasi di Mojokerto. AC, listrik, plumbing, bangunan — harga transparan mulai <strong>Rp 30.000/jam</strong>.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a href="#download" className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-orange-600 transition-colors text-center shadow-lg shadow-orange-200">
                Download Gratis
              </a>
              <Link href="/layanan" className="px-8 py-4 border-2 border-secondary text-secondary text-lg font-semibold rounded-xl hover:bg-secondary hover:text-white transition-colors text-center">
                Lihat Layanan
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">✅ Tukang Terverifikasi</span>
              <span className="flex items-center gap-1">💰 Harga Transparan</span>
              <span className="flex items-center gap-1">📱 Bayar via QRIS</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing highlight */}
      <section className="py-12 bg-white border-y">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">Rp 30.000</p>
              <p className="text-gray-500 mt-1">per jam (min. 2 jam)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">Rp 150.000</p>
              <p className="text-gray-500 mt-1">per hari (8 jam kerja)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">Rp 1.000</p>
              <p className="text-gray-500 mt-1">per km ongkos jalan</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary">Kategori Layanan</h2>
            <p className="text-gray-500 mt-2">Temukan tukang untuk berbagai kebutuhan rumah Anda</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.code} className="bg-white rounded-xl p-6 border hover:border-primary hover:shadow-lg transition-all cursor-pointer">
                <span className="text-4xl">{cat.icon}</span>
                <h3 className="font-semibold text-secondary mt-3">{cat.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{cat.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/layanan" className="text-primary font-semibold hover:underline">
              Lihat semua layanan →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary">Cara Kerja</h2>
            <p className="text-gray-500 mt-2">Booking tukang dalam 4 langkah mudah</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                  {step.num}
                </div>
                <h3 className="font-semibold text-secondary mt-4">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-2">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary">Kata Mereka</h2>
            <p className="text-gray-500 mt-2">Pengalaman pelanggan menggunakan TukangNDeso</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border">
                <div className="flex items-center gap-1 text-yellow-400 mb-3">
                  {"⭐⭐⭐⭐⭐"}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4 pt-4 border-t">
                  <p className="font-semibold text-secondary text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.area}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jadi Tukang CTA */}
      <section className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Bergabung sebagai Tukang</h2>
          <p className="text-gray-300 mt-4 text-lg">
            Dapatkan order langsung ke HP, pembayaran dijamin via QRIS, dan saldo bisa ditarik kapan saja. Gratis mendaftar!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#download" className="px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors">
              Daftar Jadi Tukang
            </a>
          </div>
          <div className="mt-6 flex justify-center gap-8 text-sm text-gray-400">
            <span>✓ Daftar gratis</span>
            <span>✓ Verifikasi 24 jam</span>
            <span>✓ Tarik saldo kapan saja</span>
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section id="download" className="py-20 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-secondary">Download Aplikasi</h2>
          <p className="text-gray-500 mt-4">Tersedia untuk Android. iOS segera menyusul.</p>
          <div className="mt-8 flex justify-center gap-4">
            <a href="#" className="inline-flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
              <div className="text-left">
                <div className="text-xs">GET IT ON</div>
                <div className="font-semibold">Google Play</div>
              </div>
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-400">Atau hubungi kami: 0812-3456-7890</p>
        </div>
      </section>
    </>
  );
}
