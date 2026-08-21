import 'package:flutter/material.dart';

class AreaScreen extends StatelessWidget {
  const AreaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Area Layanan')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6B35), Color(0xFFFF8F65)],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                children: [
                  Icon(Icons.map, color: Colors.white, size: 48),
                  SizedBox(height: 12),
                  Text(
                    'Mojokerto Kabupaten',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Jawa Timur, Indonesia',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Area Layanan Aktif',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Saat ini TukangNDeso melayani wilayah Mojokerto Kabupaten dan sekitarnya dengan radius maksimal 25 km dari titik pusat layanan.',
              style: TextStyle(height: 1.6),
            ),
            const SizedBox(height: 20),
            const Text(
              'Kecamatan yang Dilayani',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            ..._kecamatanList.map((k) => _buildAreaItem(k)),
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade700),
                  const SizedBox(height: 8),
                  Text(
                    'Wilayah Akan Diperluas',
                    style: TextStyle(fontWeight: FontWeight.w600, color: Colors.blue.shade700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Kami berencana memperluas area layanan ke Kota Mojokerto, Jombang, dan Sidoarjo. Nantikan update selanjutnya!',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.blue.shade700, fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Biaya Perjalanan',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              '• Rp 1.000 per km\n• Minimum Rp 5.000 (jarak < 5 km)\n• Maksimum Rp 50.000\n• Jarak > 25 km: di luar area layanan',
              style: TextStyle(height: 1.8),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildAreaItem(String name) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: Color(0xFF27AE60), size: 18),
          const SizedBox(width: 10),
          Text(name, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

const _kecamatanList = [
  'Mojosari',
  'Bangsal',
  'Mojoanyar',
  'Dlanggu',
  'Puri',
  'Trowulan',
  'Sooko',
  'Gedeg',
  'Kemlagi',
  'Jetis',
  'Dawarblandong',
  'Jatirejo',
  'Gondang',
  'Pacet',
  'Trawas',
  'Ngoro',
  'Pungging',
  'Kutorejo',
];
