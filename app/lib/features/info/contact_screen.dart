import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class ContactScreen extends StatelessWidget {
  const ContactScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hubungi Kami')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ada pertanyaan atau masukan?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Tim kami siap membantu Anda.', style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 24),
            _buildContactCard(
              icon: Icons.chat,
              title: 'WhatsApp',
              subtitle: '0812-3456-7890',
              description: 'Respon cepat, Senin-Sabtu 08:00-20:00 WIB',
              onTap: () => _launchUrl('https://wa.me/6281234567890'),
            ),
            _buildContactCard(
              icon: Icons.email,
              title: 'Email',
              subtitle: 'halo@tukangndeso.id',
              description: 'Untuk pertanyaan umum dan kerjasama',
              onTap: () => _launchUrl('mailto:halo@tukangndeso.id'),
            ),
            _buildContactCard(
              icon: Icons.phone,
              title: 'Telepon',
              subtitle: '(0321) 123-4567',
              description: 'Senin-Jumat 09:00-17:00 WIB',
              onTap: () => _launchUrl('tel:+623211234567'),
            ),
            _buildContactCard(
              icon: Icons.location_on,
              title: 'Kantor',
              subtitle: 'Jl. Raya Mojosari No. 45',
              description: 'Mojosari, Mojokerto Kabupaten\nJawa Timur 61382',
              onTap: null,
            ),
            const SizedBox(height: 24),
            const Text('Media Sosial', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildSocialButton('Instagram', Icons.camera_alt, () => _launchUrl('https://instagram.com/tukangndeso')),
                const SizedBox(width: 12),
                _buildSocialButton('Facebook', Icons.facebook, () => _launchUrl('https://facebook.com/tukangndeso')),
                const SizedBox(width: 12),
                _buildSocialButton('TikTok', Icons.music_note, () => _launchUrl('https://tiktok.com/@tukangndeso')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String description,
    required VoidCallback? onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFFF6B35).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: const Color(0xFFFF6B35)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(subtitle, style: const TextStyle(color: Color(0xFFFF6B35), fontWeight: FontWeight.w500)),
                    const SizedBox(height: 2),
                    Text(description, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                  ],
                ),
              ),
              if (onTap != null) Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildSocialButton(String label, IconData icon, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade200),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: const Color(0xFF2C3E50)),
              const SizedBox(height: 4),
              Text(label, style: const TextStyle(fontSize: 11)),
            ],
          ),
        ),
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
