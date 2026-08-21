import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="bg-secondary text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">TukangNDeso</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Marketplace jasa tukang terpercaya di Mojokerto. Harga transparan, tukang terverifikasi.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Perusahaan</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/tentang" className="hover:text-white">Tentang Kami</Link></li>
              <li><Link href="/area" className="hover:text-white">Area Layanan</Link></li>
              <li><a href="#" className="hover:text-white">Karir</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Layanan</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/layanan" className="hover:text-white">Semua Layanan</Link></li>
              <li><Link href="/booking" className="hover:text-white">Pesan Tukang</Link></li>
              <li><Link href="/bantuan" className="hover:text-white">Bantuan</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Kontak</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>0812-3456-7890</li>
              <li>halo@tukangndeso.id</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-12 pt-6 text-center text-sm text-gray-500">
          &copy; 2026 TukangNDeso. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
