const SERVICES = [
  {
    code: "AC", name: "AC & Pendingin", icon: "🧊",
    items: ["Pasang AC Split / Standing", "Cuci AC (deep clean)", "Isi Freon", "Perbaikan AC", "Bongkar & Relokasi AC"],
  },
  {
    code: "BGN", name: "Bangunan", icon: "🧱",
    items: ["Renovasi ringan", "Plester & Aci", "Pasang Keramik", "Perbaikan Atap", "Pengecatan"],
  },
  {
    code: "LST", name: "Listrik", icon: "⚡",
    items: ["Instalasi listrik baru", "Perbaikan konsleting", "Tambah daya", "Pasang lampu & stop kontak", "Panel listrik"],
  },
  {
    code: "PLB", name: "Plumbing / Pipa", icon: "🔧",
    items: ["Saluran mampet", "Instalasi pipa air", "Perbaikan WC / toilet", "Pompa air", "Water heater"],
  },
  {
    code: "LAS", name: "Las & Besi", icon: "🔩",
    items: ["Pagar besi", "Kanopi", "Teralis jendela", "Railing tangga", "Pintu besi"],
  },
  {
    code: "TKY", name: "Tukang Kayu", icon: "🪵",
    items: ["Kusen pintu & jendela", "Lemari custom", "Plafon kayu", "Partisi ruangan", "Furniture repair"],
  },
  {
    code: "CLN", name: "Cleaning", icon: "🧹",
    items: ["Bersih rumah", "Poles lantai", "Buang puing", "Bersih pasca renovasi"],
  },
  {
    code: "CAT", name: "Cat & Finishing", icon: "🎨",
    items: ["Pengecatan interior", "Pengecatan eksterior", "Waterproofing", "Finishing kayu"],
  },
  {
    code: "TNM", name: "Taman", icon: "🌳",
    items: ["Landscaping", "Potong rumput", "Tanam tanaman", "Kolam ikan"],
  },
];

export default function LayananPage() {
  return (
    <div className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-secondary">Layanan Kami</h1>
          <p className="text-gray-500 mt-3 text-lg">9 kategori layanan untuk semua kebutuhan rumah dan properti Anda</p>
        </div>

        {/* Pricing Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 mb-16">
          <h2 className="text-xl font-bold text-secondary text-center mb-6">Model Harga</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-2xl font-bold text-primary">Rp 30.000</p>
              <p className="text-gray-500">/jam</p>
              <p className="text-xs text-gray-400 mt-1">Minimum 2 jam</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-2xl font-bold text-primary">Rp 150.000</p>
              <p className="text-gray-500">/hari</p>
              <p className="text-xs text-gray-400 mt-1">8 jam kerja</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-2xl font-bold text-primary">Rp 1.000</p>
              <p className="text-gray-500">/km ongkos jalan</p>
              <p className="text-xs text-gray-400 mt-1">Min Rp 5.000, Maks Rp 50.000</p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Surcharge: Malam +30% | Weekend +20% | Libur +50% | Urgent +Rp 25.000
          </p>
        </div>

        {/* Service Grid */}
        <div className="space-y-8">
          {SERVICES.map((svc) => (
            <div key={svc.code} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{svc.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-secondary">{svc.name}</h3>
                  <p className="text-sm text-gray-400">Kode: {svc.code}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {svc.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
