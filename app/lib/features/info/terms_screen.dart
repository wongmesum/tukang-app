import 'package:flutter/material.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Syarat & Ketentuan')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Terakhir diperbarui: 30 Juli 2026', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            const SizedBox(height: 16),
            _buildSection('1. Ketentuan Umum',
              'Dengan menggunakan aplikasi TukangNDeso, Anda menyetujui syarat dan ketentuan berikut. '
              'Jika Anda tidak setuju, harap berhenti menggunakan layanan kami.'),
            _buildSection('2. Definisi',
              '• "Platform": aplikasi TukangNDeso (Android)\n'
              '• "Pelanggan": pengguna yang memesan layanan tukang\n'
              '• "Tukang": penyedia jasa yang terdaftar dan terverifikasi\n'
              '• "Order": pesanan layanan yang dibuat melalui platform\n'
              '• "QRIS": metode pembayaran utama menggunakan QR code standar nasional'),
            _buildSection('3. Pendaftaran Akun',
              '• Pengguna wajib mendaftar dengan nomor HP yang valid\n'
              '• Satu nomor HP hanya untuk satu akun\n'
              '• Informasi yang diberikan harus benar dan akurat\n'
              '• Pengguna bertanggung jawab menjaga kerahasiaan akun'),
            _buildSection('4. Layanan & Harga',
              '• Harga ditampilkan secara transparan sebelum booking\n'
              '• Tarif dasar: Rp 30.000/jam atau Rp 150.000/hari\n'
              '• Biaya perjalanan dihitung otomatis berdasarkan jarak\n'
              '• Surcharge (tambahan): malam +30%, weekend +20%, libur +50%, urgent +Rp 25.000\n'
              '• Harga yang dikonfirmasi saat booking adalah harga final\n'
              '• TukangNDeso berhak mengubah tarif dengan pemberitahuan sebelumnya'),
            _buildSection('5. Pemesanan & Pembatalan',
              '• Order yang sudah dikonfirmasi mengikat kedua pihak\n'
              '• Pelanggan dapat membatalkan sebelum tukang berangkat tanpa biaya\n'
              '• Pembatalan setelah tukang berangkat dapat dikenakan biaya perjalanan\n'
              '• Tukang yang menolak/membatalkan order berulang kali dapat di-suspend\n'
              '• Order yang tidak di-accept dalam 3 menit otomatis expired'),
            _buildSection('6. Pembayaran',
              '• Pembayaran utama via QRIS (semua e-wallet & mobile banking)\n'
              '• Cash hanya sebagai fallback jika QRIS tidak tersedia\n'
              '• Pembayaran dilakukan setelah pekerjaan selesai dan dikonfirmasi\n'
              '• QR code berlaku 15 menit sejak dibuat\n'
              '• Refund diproses dalam 3-7 hari kerja ke saldo asal'),
            _buildSection('7. Kewajiban Pelanggan',
              '• Memberikan informasi lokasi dan masalah yang akurat\n'
              '• Menyediakan akses ke area kerja\n'
              '• Memperlakukan tukang dengan hormat\n'
              '• Melakukan pembayaran sesuai kesepakatan\n'
              '• Melaporkan masalah melalui fitur dispute jika ada kendala'),
            _buildSection('8. Kewajiban Tukang',
              '• Menyelesaikan pekerjaan sesuai permintaan\n'
              '• Datang tepat waktu sesuai jadwal\n'
              '• Membawa peralatan kerja yang memadai\n'
              '• Menjaga kebersihan area kerja\n'
              '• Bersikap profesional dan sopan'),
            _buildSection('9. Garansi',
              '• TukangNDeso menyediakan mekanisme dispute untuk masalah kualitas\n'
              '• Pelanggan dapat melaporkan masalah dalam 24 jam setelah pekerjaan selesai\n'
              '• Tim admin akan meninjau dan memberikan resolusi yang adil\n'
              '• Resolusi dapat berupa pengerjaan ulang atau refund (sebagian/penuh)'),
            _buildSection('10. Larangan',
              '• Melakukan transaksi di luar platform setelah matching\n'
              '• Memberikan informasi palsu atau menyesatkan\n'
              '• Menggunakan platform untuk tujuan ilegal\n'
              '• Melakukan pelecehan terhadap pengguna lain\n'
              '• Membuat akun ganda atau akun palsu'),
            _buildSection('11. Batasan Tanggung Jawab',
              'TukangNDeso adalah platform penghubung. Kami tidak bertanggung jawab atas:\n'
              '• Kerusakan yang terjadi akibat kelalaian tukang (ditangani via dispute)\n'
              '• Keterlambatan yang disebabkan faktor di luar kendali (cuaca, kemacetan)\n'
              '• Material/bahan yang dibawa sendiri oleh pelanggan'),
            _buildSection('12. Pemutusan Layanan',
              'TukangNDeso berhak menonaktifkan akun pengguna yang:\n'
              '• Melanggar syarat & ketentuan\n'
              '• Melakukan penipuan atau penyalahgunaan\n'
              '• Menerima keluhan berulang dari pihak lain\n'
              '• Tidak aktif selama 12 bulan berturut-turut'),
            _buildSection('13. Hukum yang Berlaku',
              'Syarat & ketentuan ini tunduk pada hukum Republik Indonesia. '
              'Setiap sengketa akan diselesaikan secara musyawarah terlebih dahulu, '
              'dan jika tidak tercapai kesepakatan, akan diselesaikan melalui '
              'Pengadilan Negeri Mojokerto.'),
          ],
        ),
      ),
    );
  }

  static Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(content, style: const TextStyle(height: 1.7, fontSize: 14)),
        ],
      ),
    );
  }
}
