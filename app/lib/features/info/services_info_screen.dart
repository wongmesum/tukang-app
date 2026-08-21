import 'package:flutter/material.dart';

class ServicesInfoScreen extends StatelessWidget {
  const ServicesInfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Layanan')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Kategori Layanan Kami',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'TukangNDeso menyediakan berbagai layanan jasa tukang profesional:',
              style: TextStyle(color: Colors.grey[600], height: 1.5),
            ),
            const SizedBox(height: 24),
            _buildCategorySection('🧊', 'AC & Pendingin', [
              'Pasang AC Split / Standing',
              'Cuci AC (deep clean)',
              'Isi Freon',
              'Perbaikan AC (tidak dingin, bocor)',
              'Bongkar & Relokasi AC',
            ]),
            _buildCategorySection('🧱', 'Bangunan', [
              'Renovasi ringan',
              'Plester & Aci',
              'Pasang Keramik',
              'Perbaikan Atap',
              'Pengecatan',
            ]),
            _buildCategorySection('⚡', 'Listrik', [
              'Instalasi listrik baru',
              'Perbaikan konsleting',
              'Tambah daya',
              'Pasang lampu & stop kontak',
              'Panel listrik',
            ]),
            _buildCategorySection('🔧', 'Plumbing / Pipa', [
              'Saluran mampet',
              'Instalasi pipa air',
              'Perbaikan WC / toilet',
              'Pompa air',
              'Water heater',
            ]),
            _buildCategorySection('🔩', 'Las & Besi', [
              'Pagar besi',
              'Kanopi',
              'Teralis jendela',
              'Railing tangga',
              'Pintu besi',
            ]),
            _buildCategorySection('🪵', 'Tukang Kayu', [
              'Kusen pintu & jendela',
              'Lemari custom',
              'Plafon kayu',
              'Partisi ruangan',
              'Furniture repair',
            ]),
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFF6B35).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Column(
                children: [
                  Text('Model Harga', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Column(children: [
                        Text('Rp 30.000', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFFFF6B35))),
                        Text('/jam', style: TextStyle(color: Colors.grey)),
                      ]),
                      Column(children: [
                        Text('Rp 150.000', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFFFF6B35))),
                        Text('/hari', style: TextStyle(color: Colors.grey)),
                      ]),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text('+ Ongkos jalan Rp 1.000/km', style: TextStyle(fontSize: 13, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildCategorySection(String emoji, String title, List<String> items) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(emoji, style: const TextStyle(fontSize: 24)),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          ...items.map((item) => Padding(
            padding: const EdgeInsets.only(left: 36, bottom: 4),
            child: Row(
              children: [
                Container(width: 4, height: 4, decoration: const BoxDecoration(color: Colors.grey, shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Text(item, style: const TextStyle(fontSize: 14)),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
