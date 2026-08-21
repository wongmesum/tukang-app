import 'package:flutter/material.dart';

class NewsScreen extends StatelessWidget {
  const NewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Berita')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildNewsCard(
            title: 'TukangNDeso Resmi Diluncurkan di Mojokerto Kabupaten',
            date: '30 Juli 2026',
            summary: 'Platform marketplace jasa tukang pertama di Mojokerto resmi beroperasi. '
                'Layanan awal mencakup kategori AC, Bangunan, Listrik, dan Plumbing dengan tarif transparan mulai Rp 30.000/jam.',
            isNew: true,
          ),
          _buildNewsCard(
            title: 'Rekrutmen Tukang Gelombang Pertama Dibuka',
            date: '25 Juli 2026',
            summary: 'TukangNDeso membuka pendaftaran untuk 30 tukang pertama di kecamatan Mojosari dan sekitarnya. '
                'Pendaftaran gratis, verifikasi dalam 24-48 jam.',
          ),
          _buildNewsCard(
            title: 'Kerjasama dengan Merchant QRIS Mojokerto',
            date: '20 Juli 2026',
            summary: 'Pembayaran di TukangNDeso kini mendukung semua e-wallet dan mobile banking melalui QRIS standar nasional.',
          ),
          _buildNewsCard(
            title: 'Target 100 Tukang Aktif di Q4 2026',
            date: '15 Juli 2026',
            summary: 'Manajemen menargetkan 100 tukang terverifikasi aktif sebelum akhir tahun 2026 untuk memenuhi permintaan layanan yang terus meningkat.',
          ),
        ],
      ),
    );
  }

  static Widget _buildNewsCard({
    required String title,
    required String date,
    required String summary,
    bool isNew = false,
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
                if (isNew) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6B35),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('BARU', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 8),
                ],
                Text(date, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(summary, style: TextStyle(color: Colors.grey[700], height: 1.5, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
