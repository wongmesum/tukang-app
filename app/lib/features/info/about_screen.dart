import 'package:flutter/material.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tentang Kami')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF6B35),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.handyman, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'TukangNDeso',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Marketplace Jasa Tukang #1 di Mojokerto',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Siapa Kami?',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'TukangNDeso adalah platform marketplace jasa tukang yang menghubungkan pelanggan dengan tukang terdekat di wilayah Mojokerto Kabupaten, Jawa Timur. Kami percaya bahwa setiap orang berhak mendapatkan layanan tukang yang profesional, transparan, dan terjangkau.',
              style: TextStyle(height: 1.6),
            ),
            const SizedBox(height: 24),
            const Text(
              'Visi',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Menjadi platform jasa tukang terpercaya yang memberdayakan tukang lokal dan memudahkan masyarakat mendapatkan layanan rumah tangga berkualitas.',
              style: TextStyle(height: 1.6),
            ),
            const SizedBox(height: 24),
            const Text(
              'Misi',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildMissionItem('1', 'Menyediakan platform yang transparan dengan harga jelas tanpa negosiasi ribet.'),
            _buildMissionItem('2', 'Memberdayakan tukang lokal dengan akses ke lebih banyak pelanggan dan penghasilan yang stabil.'),
            _buildMissionItem('3', 'Menjamin kualitas layanan melalui sistem rating, review, dan verifikasi tukang.'),
            _buildMissionItem('4', 'Mempermudah pembayaran dengan QRIS yang kompatibel semua e-wallet dan mobile banking.'),
            const SizedBox(height: 24),
            const Text(
              'Kenapa TukangNDeso?',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildFeatureItem(Icons.visibility, 'Transparan', 'Harga terlihat sebelum booking, breakdown jelas.'),
            _buildFeatureItem(Icons.location_on, 'Terdekat', 'Matching berbasis lokasi, tukang datang lebih cepat.'),
            _buildFeatureItem(Icons.schedule, 'Fleksibel', 'Pilih per jam atau per hari sesuai kebutuhan.'),
            _buildFeatureItem(Icons.verified_user, 'Terjamin', 'Tukang terverifikasi dengan rating dari pelanggan.'),
            const SizedBox(height: 32),
            Center(
              child: Text(
                '© 2026 TukangNDeso. All rights reserved.',
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildMissionItem(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              color: Color(0xFFFF6B35),
              shape: BoxShape.circle,
            ),
            child: Center(child: Text(number, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: const TextStyle(height: 1.5))),
        ],
      ),
    );
  }

  static Widget _buildFeatureItem(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFFF6B35).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFFFF6B35), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
