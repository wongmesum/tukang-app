import 'package:flutter/material.dart';

class CareerScreen extends StatelessWidget {
  const CareerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Karir')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF2C3E50), Color(0xFF3D566E)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Column(
                children: [
                  Text('Bergabung dengan Tim Kami', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                  SizedBox(height: 8),
                  Text('Bantu kami membangun platform jasa tukang terbaik di Indonesia', textAlign: TextAlign.center, style: TextStyle(color: Colors.white70, fontSize: 14)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Posisi Tersedia', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _buildJobCard(
              title: 'Community Manager — Mojokerto',
              type: 'Full-time',
              description: 'Mengelola komunitas tukang, onboarding tukang baru, memastikan kualitas layanan di lapangan. '
                  'Pengalaman di community management atau operasional lapangan diutamakan.',
            ),
            _buildJobCard(
              title: 'Customer Support',
              type: 'Part-time',
              description: 'Handle pertanyaan pelanggan via WhatsApp dan in-app. '
                  'Jam kerja fleksibel, bisa remote. Komunikatif dan sabar.',
            ),
            _buildJobCard(
              title: 'Flutter Developer',
              type: 'Full-time / Remote',
              description: 'Mengembangkan aplikasi TukangNDeso (customer + worker app). '
                  'Familiar dengan Riverpod, go_router, dan Dio. Pengalaman 1+ tahun dengan Flutter.',
            ),
            _buildJobCard(
              title: 'Backend Developer',
              type: 'Full-time / Remote',
              description: 'Develop dan maintain API dengan Bun + Hono + PostgreSQL. '
                  'Familiar dengan TypeScript strict, Prisma, dan real-time (WebSocket).',
            ),
            _buildJobCard(
              title: 'Digital Marketing',
              type: 'Part-time',
              description: 'Mengelola social media, campaign lokal Mojokerto, dan strategi akuisisi pelanggan. '
                  'Pengalaman di marketing app atau marketplace diutamakan.',
            ),
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
                  Text('Tertarik?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  SizedBox(height: 8),
                  Text(
                    'Kirim CV dan portofolio ke:\nkarir@tukangndeso.id\n\nAtau hubungi kami via WhatsApp:\n0812-3456-7890',
                    textAlign: TextAlign.center,
                    style: TextStyle(height: 1.6),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildJobCard({required String title, required String type, required String description}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFF27AE60).withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(type, style: const TextStyle(color: Color(0xFF27AE60), fontSize: 11, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(description, style: TextStyle(color: Colors.grey[700], height: 1.5, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
