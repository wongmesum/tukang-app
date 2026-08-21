"use client";

import { useState } from "react";

const FAQ = [
  { q: "Bagaimana cara memesan tukang?", a: "Buka app → pilih kategori → pilih layanan → isi detail (alamat, jadwal, durasi) → lihat estimasi harga → konfirmasi booking → tunggu tukang terdekat menerima." },
  { q: "Berapa biaya layanan?", a: "Per Jam: Rp 30.000 (min 2 jam). Per Hari: Rp 150.000 (8 jam). Ongkos jalan: Rp 1.000/km. Surcharge malam +30%, weekend +20%, libur +50%, urgent +Rp 25.000." },
  { q: "Bagaimana cara membayar?", a: "Setelah pekerjaan selesai, scan QRIS yang muncul di app dengan e-wallet (GoPay, OVO, DANA, ShopeePay) atau mobile banking. Cash juga bisa sebagai fallback." },
  { q: "Bagaimana jika tukang tidak datang?", a: "Order yang tidak diterima dalam waktu tertentu otomatis expired. Anda bisa buat order baru tanpa biaya apapun." },
  { q: "Bagaimana cara membatalkan?", a: "Sebelum tukang berangkat: gratis. Setelah tukang berangkat: mungkin dikenakan biaya perjalanan. Buka detail order → Batalkan → pilih alasan." },
  { q: "Bagaimana jika ada masalah dengan pekerjaan?", a: "Gunakan fitur Dispute di app. Tim admin akan meninjau dalam 24 jam. Resolusi bisa pengerjaan ulang atau refund." },
  { q: "Bagaimana cara menjadi tukang?", a: "Download app → Daftar sebagai Tukang → isi KTP, alamat, keahlian → tunggu verifikasi 24-48 jam → approved → mulai terima order!" },
  { q: "Apakah tukang diverifikasi?", a: "Ya. Setiap tukang melalui verifikasi identitas (KTP) dan approval admin. Tukang juga punya rating dari pelanggan sebelumnya." },
  { q: "Area mana yang dilayani?", a: "Saat ini Mojokerto Kabupaten (18 kecamatan) dengan radius maks 25 km. Ekspansi ke Kota Mojokerto, Jombang, dan Sidoarjo segera." },
  { q: "Bagaimana tukang menarik saldo?", a: "Buka menu Dompet → Tarik Saldo → masukkan nominal dan nomor rekening/e-wallet → konfirmasi. Diproses 1-3 hari kerja." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left">
        <span className="font-medium text-secondary pr-4">{q}</span>
        <span className="text-primary text-xl flex-shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="pb-4 text-gray-600 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

export default function BantuanPage() {
  return (
    <div className="py-20">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-secondary text-center">Pusat Bantuan</h1>
        <p className="text-gray-500 text-center mt-3">Pertanyaan yang sering ditanyakan</p>

        <div className="mt-12">
          {FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <div className="mt-16 bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold text-secondary">Masih butuh bantuan?</h2>
          <p className="text-gray-600 mt-2">Tim customer service kami siap membantu</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors">
              Chat WhatsApp
            </a>
            <a href="mailto:cs@tukangndeso.id" className="px-6 py-3 border-2 border-secondary text-secondary rounded-xl font-semibold hover:bg-secondary hover:text-white transition-colors">
              Email CS
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4">Senin-Sabtu: 08:00-20:00 WIB | Minggu: 09:00-17:00 WIB</p>
        </div>
      </div>
    </div>
  );
}
