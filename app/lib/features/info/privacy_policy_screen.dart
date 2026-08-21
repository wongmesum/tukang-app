import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kebijakan & Privasi')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Terakhir diperbarui: 30 Juli 2026', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            const SizedBox(height: 16),
            _buildSection('1. Pendahuluan',
              'PT TukangNDeso Indonesia ("kami", "TukangNDeso") berkomitmen melindungi privasi pengguna aplikasi kami. '
              'Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda.'),
            _buildSection('2. Informasi yang Kami Kumpulkan',
              '• Informasi akun: nomor telepon, nama, email (opsional)\n'
              '• Lokasi: koordinat GPS saat booking untuk menghitung jarak dan mencari tukang terdekat\n'
              '• Alamat: alamat rumah/kantor yang Anda simpan\n'
              '• Riwayat order: layanan yang dipesan, harga, status\n'
              '• Foto: foto masalah yang diunggah saat booking\n'
              '• Data perangkat: tipe HP, versi OS, untuk keperluan teknis'),
            _buildSection('3. Penggunaan Informasi',
              'Kami menggunakan informasi Anda untuk:\n'
              '• Memproses dan mengelola pesanan layanan\n'
              '• Mencocokkan Anda dengan tukang terdekat\n'
              '• Menghitung biaya perjalanan berdasarkan jarak\n'
              '• Mengirim notifikasi status order\n'
              '• Meningkatkan kualitas layanan\n'
              '• Mencegah penipuan dan penyalahgunaan'),
            _buildSection('4. Pembagian Informasi',
              '• Tukang: menerima nama, alamat, dan foto masalah Anda saat order aktif\n'
              '• Payment provider: data transaksi untuk memproses pembayaran QRIS\n'
              '• Kami TIDAK menjual data pribadi Anda ke pihak ketiga\n'
              '• Kami TIDAK membagikan nomor telepon Anda ke pihak yang tidak berwenang'),
            _buildSection('5. Penyimpanan Data',
              '• Data disimpan di server yang aman dengan enkripsi\n'
              '• Riwayat order disimpan selama akun aktif\n'
              '• Anda dapat meminta penghapusan akun dan data kapan saja\n'
              '• Setelah penghapusan, data dihapus dalam 30 hari kerja'),
            _buildSection('6. Keamanan',
              '• Komunikasi dienkripsi menggunakan HTTPS/TLS\n'
              '• Token akses (JWT) untuk autentikasi\n'
              '• OTP untuk verifikasi nomor telepon\n'
              '• Akses database dibatasi hanya untuk personel yang berwenang'),
            _buildSection('7. Hak Pengguna',
              'Anda berhak:\n'
              '• Mengakses data pribadi yang kami simpan\n'
              '• Memperbarui atau memperbaiki data Anda\n'
              '• Meminta penghapusan akun\n'
              '• Menarik persetujuan penggunaan lokasi\n'
              '• Mengajukan keluhan ke otoritas perlindungan data'),
            _buildSection('8. Cookies & Tracking',
              'Aplikasi TukangNDeso tidak menggunakan cookies. Kami menggunakan analitik anonim untuk '
              'memahami pola penggunaan aplikasi tanpa mengidentifikasi pengguna secara personal.'),
            _buildSection('9. Perubahan Kebijakan',
              'Kami dapat memperbarui kebijakan ini sewaktu-waktu. Perubahan material akan dinotifikasi '
              'melalui aplikasi. Penggunaan berlanjut setelah perubahan berarti Anda menyetujui kebijakan baru.'),
            _buildSection('10. Kontak',
              'Jika ada pertanyaan tentang kebijakan privasi ini:\n'
              '• Email: privasi@tukangndeso.id\n'
              '• WhatsApp: 0812-3456-7890\n'
              '• Alamat: Jl. Raya Mojosari No. 45, Mojokerto Kab., Jawa Timur'),
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
