import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bantuan')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search hint
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.search, color: Colors.grey[500]),
                  const SizedBox(width: 12),
                  Text('Cari bantuan di bawah ini...', style: TextStyle(color: Colors.grey[500])),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text('Pertanyaan Umum (FAQ)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),

            _buildFaqItem(
              'Bagaimana cara memesan tukang?',
              '1. Buka aplikasi dan pilih kategori layanan (AC, Listrik, dll)\n'
              '2. Pilih sub-layanan yang dibutuhkan\n'
              '3. Isi detail: deskripsi masalah, foto (opsional), alamat, jadwal\n'
              '4. Pilih skema harga (per jam/per hari) dan durasi\n'
              '5. Lihat estimasi harga, lalu tekan "Cari Tukang"\n'
              '6. Tunggu tukang terdekat menerima order Anda',
            ),
            _buildFaqItem(
              'Berapa biaya layanan?',
              '• Per Jam: Rp 30.000/jam (minimum 2 jam)\n'
              '• Per Hari: Rp 150.000/hari (8 jam kerja)\n'
              '• Ongkos jalan: Rp 1.000/km (min Rp 5.000, maks Rp 50.000)\n'
              '• Surcharge malam (18:00-06:00): +30%\n'
              '• Surcharge weekend: +20%\n'
              '• Surcharge hari libur: +50%\n'
              '• Surcharge urgent (<2 jam): +Rp 25.000\n\n'
              'Semua biaya ditampilkan transparan sebelum Anda konfirmasi.',
            ),
            _buildFaqItem(
              'Bagaimana cara membayar?',
              'Pembayaran utama menggunakan QRIS yang kompatibel dengan semua e-wallet (GoPay, OVO, DANA, ShopeePay, dll) '
              'dan mobile banking (BCA, Mandiri, BNI, BRI, dll).\n\n'
              '1. Setelah pekerjaan selesai, tekan "Bayar"\n'
              '2. Scan QR code yang muncul dengan e-wallet atau mobile banking Anda\n'
              '3. Konfirmasi pembayaran\n'
              '4. Selesai! Saldo langsung masuk ke tukang.\n\n'
              'Cash tersedia sebagai fallback jika QRIS tidak memungkinkan.',
            ),
            _buildFaqItem(
              'Bagaimana jika tukang tidak datang?',
              'Order yang tidak di-accept dalam waktu tertentu akan otomatis expired. '
              'Anda dapat:\n'
              '• Menunggu sistem mencari tukang lain\n'
              '• Membuat order baru\n'
              '• Menghubungi CS kami untuk bantuan\n\n'
              'Anda tidak akan dikenakan biaya untuk order yang expired.',
            ),
            _buildFaqItem(
              'Bagaimana cara membatalkan order?',
              '• Sebelum tukang berangkat: gratis, tanpa biaya\n'
              '• Setelah tukang berangkat: mungkin dikenakan biaya perjalanan\n\n'
              'Untuk membatalkan:\n'
              '1. Buka detail order\n'
              '2. Tekan "Batalkan Order"\n'
              '3. Isi alasan pembatalan\n'
              '4. Konfirmasi',
            ),
            _buildFaqItem(
              'Bagaimana jika ada masalah dengan pekerjaan?',
              'Gunakan fitur Dispute:\n'
              '1. Buka detail order yang bermasalah\n'
              '2. Tekan "Laporkan Masalah"\n'
              '3. Jelaskan masalahnya + foto jika perlu\n'
              '4. Tim admin akan meninjau dalam 24 jam\n\n'
              'Resolusi bisa berupa pengerjaan ulang atau refund.',
            ),
            _buildFaqItem(
              'Bagaimana cara menjadi tukang di TukangNDeso?',
              '1. Download aplikasi dan pilih "Daftar sebagai Tukang"\n'
              '2. Isi data: nama, HP, foto KTP, alamat\n'
              '3. Pilih kategori keahlian (bisa lebih dari 1)\n'
              '4. Set radius kerja\n'
              '5. Tunggu verifikasi admin (24-48 jam)\n'
              '6. Setelah approved, langsung bisa terima order!',
            ),
            _buildFaqItem(
              'Apakah tukang diverifikasi?',
              'Ya! Setiap tukang melalui proses verifikasi:\n'
              '• Verifikasi identitas (KTP)\n'
              '• Pengecekan kategori keahlian\n'
              '• Approval oleh tim admin\n\n'
              'Tukang juga memiliki rating dari pelanggan sebelumnya yang bisa Anda lihat.',
            ),
            _buildFaqItem(
              'Bagaimana cara menarik saldo (untuk tukang)?',
              '1. Buka menu Dompet di dashboard tukang\n'
              '2. Tekan "Tarik Saldo"\n'
              '3. Masukkan nominal dan nomor rekening/e-wallet tujuan\n'
              '4. Konfirmasi\n\n'
              'Penarikan diproses dalam 1-3 hari kerja.',
            ),
            _buildFaqItem(
              'Area mana saja yang dilayani?',
              'Saat ini TukangNDeso melayani Mojokerto Kabupaten dan sekitarnya '
              'dengan radius maksimal 25 km. Kami berencana memperluas ke Kota Mojokerto, '
              'Jombang, dan Sidoarjo dalam waktu dekat.',
            ),

            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),
            const Text('Masih butuh bantuan?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () async {
                  final uri = Uri.parse('https://wa.me/6281234567890?text=Halo%20CS%20TukangNDeso,%20saya%20butuh%20bantuan');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.chat),
                label: const Text('Chat dengan CS via WhatsApp'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final uri = Uri.parse('mailto:cs@tukangndeso.id');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  }
                },
                icon: const Icon(Icons.email_outlined),
                label: const Text('Email: cs@tukangndeso.id'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildFaqItem(String question, String answer) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 0),
        childrenPadding: const EdgeInsets.only(bottom: 16),
        title: Text(question, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(answer, style: TextStyle(color: Colors.grey[700], height: 1.6, fontSize: 14)),
          ),
        ],
      ),
    );
  }
}
