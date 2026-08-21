import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class CustomerServiceScreen extends StatelessWidget {
  const CustomerServiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer Service')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF27AE60).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Icon(Icons.support_agent, size: 48, color: Color(0xFF27AE60)),
                  const SizedBox(height: 12),
                  const Text('Butuh Bantuan?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Tim CS kami siap membantu Anda', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Jam Operasional', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            _buildScheduleRow('Senin - Sabtu', '08:00 - 20:00 WIB'),
            _buildScheduleRow('Minggu', '09:00 - 17:00 WIB'),
            _buildScheduleRow('Hari Libur Nasional', '10:00 - 15:00 WIB'),
            const SizedBox(height: 24),
            const Text('Hubungi CS', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            _buildCsButton(
              icon: Icons.chat,
              label: 'Chat via WhatsApp',
              subtitle: 'Respon dalam 5 menit',
              color: const Color(0xFF25D366),
              onTap: () => _launchUrl('https://wa.me/6281234567890?text=Halo%20CS%20TukangNDeso'),
            ),
            const SizedBox(height: 12),
            _buildCsButton(
              icon: Icons.email,
              label: 'Email Support',
              subtitle: 'cs@tukangndeso.id',
              color: const Color(0xFFFF6B35),
              onTap: () => _launchUrl('mailto:cs@tukangndeso.id'),
            ),
            const SizedBox(height: 12),
            _buildCsButton(
              icon: Icons.phone,
              label: 'Telepon',
              subtitle: '0812-3456-7890',
              color: const Color(0xFF2C3E50),
              onTap: () => _launchUrl('tel:+6281234567890'),
            ),
            const SizedBox(height: 24),
            const Text('Yang Bisa Kami Bantu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            _buildHelpItem('Masalah pembayaran atau refund'),
            _buildHelpItem('Order tidak sesuai atau dispute'),
            _buildHelpItem('Tukang tidak datang atau terlambat'),
            _buildHelpItem('Pertanyaan tentang harga dan layanan'),
            _buildHelpItem('Kendala teknis dengan aplikasi'),
            _buildHelpItem('Laporan tukang tidak profesional'),
            _buildHelpItem('Permintaan pembatalan order'),
          ],
        ),
      ),
    );
  }

  static Widget _buildScheduleRow(String day, String time) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(day, style: const TextStyle(fontSize: 14)),
          Text(time, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        ],
      ),
    );
  }

  static Widget _buildCsButton({
    required IconData icon,
    required String label,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(subtitle, style: TextStyle(color: Colors.grey[500], fontSize: 13)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildHelpItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, size: 18, color: Color(0xFF27AE60)),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 14))),
        ],
      ),
    );
  }

  static Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
