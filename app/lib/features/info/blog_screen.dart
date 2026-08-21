import 'package:flutter/material.dart';

class BlogScreen extends StatelessWidget {
  const BlogScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Blog')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildBlogCard(
            title: 'Tips Merawat AC Agar Tetap Dingin dan Hemat Listrik',
            category: 'Tips & Trik',
            readTime: '5 menit',
            content: 'AC yang rajin diservis minimal 3 bulan sekali akan bekerja lebih efisien. '
                'Bersihkan filter sendiri setiap 2 minggu, dan panggil tukang AC profesional untuk deep cleaning freon dan evaporator setiap 3-6 bulan.',
          ),
          _buildBlogCard(
            title: '5 Tanda Instalasi Listrik Rumah Perlu Diperbaiki',
            category: 'Edukasi',
            readTime: '4 menit',
            content: '1) Sering trip MCB, 2) Colokan panas saat digunakan, 3) Lampu berkedip-kedip, '
                '4) Bau terbakar dari stop kontak, 5) Kabel terlihat aus atau retak. '
                'Jangan abaikan tanda-tanda ini, segera hubungi tukang listrik.',
          ),
          _buildBlogCard(
            title: 'Berapa Biaya Renovasi Kamar Mandi? Panduan Lengkap',
            category: 'Panduan Harga',
            readTime: '7 menit',
            content: 'Renovasi kamar mandi standar ukuran 2x2m biasanya membutuhkan 3-5 hari kerja. '
                'Dengan TukangNDeso, Anda bisa booking tukang bangunan dengan tarif harian Rp 150.000/hari. '
                'Total estimasi termasuk ongkos jalan dihitung otomatis sebelum booking.',
          ),
          _buildBlogCard(
            title: 'Saluran Mampet? Ini Penyebab dan Solusinya',
            category: 'Tips & Trik',
            readTime: '3 menit',
            content: 'Penyebab saluran mampet yang paling umum: penumpukan lemak dapur, rambut di kamar mandi, '
                'dan sampah organik. Untuk pencegahan, pasang saringan di setiap lubang pembuangan. '
                'Jika sudah parah, hubungi tukang plumbing untuk pembersihan profesional.',
          ),
          _buildBlogCard(
            title: 'Keuntungan Jadi Tukang di TukangNDeso',
            category: 'Untuk Tukang',
            readTime: '4 menit',
            content: 'Bergabung dengan TukangNDeso berarti: order masuk langsung ke HP, '
                'tidak perlu cari pelanggan sendiri, pembayaran dijamin via QRIS, '
                'dan saldo bisa ditarik kapan saja. Daftar gratis dan mulai terima order dalam 24-48 jam setelah verifikasi.',
          ),
        ],
      ),
    );
  }

  static Widget _buildBlogCard({
    required String title,
    required String category,
    required String readTime,
    required String content,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2C3E50).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(category, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF2C3E50))),
                ),
                const Spacer(),
                Icon(Icons.schedule, size: 14, color: Colors.grey[400]),
                const SizedBox(width: 4),
                Text(readTime, style: TextStyle(color: Colors.grey[400], fontSize: 12)),
              ],
            ),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(content, style: TextStyle(color: Colors.grey[700], height: 1.5, fontSize: 14), maxLines: 4, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}
