import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provider to track if onboarding has been seen
final hasSeenOnboardingProvider = FutureProvider<bool>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('has_seen_onboarding') ?? false;
});

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _controller = PageController();
  int _currentPage = 0;

  final _slides = const [
    _SlideData(
      icon: Icons.handyman,
      color: Color(0xFFFF6B35),
      title: 'Tukang Profesional\ndi Ujung Jari',
      subtitle: 'Cari dan booking tukang terverifikasi untuk semua kebutuhan rumah Anda — AC, listrik, plumbing, bangunan, dan lainnya.',
    ),
    _SlideData(
      icon: Icons.price_check,
      color: Color(0xFF27AE60),
      title: 'Harga Transparan\nTanpa Ribet',
      subtitle: 'Lihat estimasi harga lengkap sebelum booking. Tarif mulai Rp 30.000/jam, tanpa biaya tersembunyi.',
    ),
    _SlideData(
      icon: Icons.location_on,
      color: Color(0xFF2980B9),
      title: 'Tukang Terdekat\nDatang Lebih Cepat',
      subtitle: 'Sistem matching otomatis mencarikan tukang terdekat dari lokasi Anda. Tidak perlu cari sendiri.',
    ),
    _SlideData(
      icon: Icons.qr_code,
      color: Color(0xFF8E44AD),
      title: 'Bayar Mudah\nvia QRIS',
      subtitle: 'Bayar dengan e-wallet atau mobile banking apa saja. Scan QR, selesai. Cash juga bisa.',
    ),
  ];

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('has_seen_onboarding', true);
    if (mounted) {
      context.go('/landing');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: TextButton(
                  onPressed: _completeOnboarding,
                  child: const Text('Lewati', style: TextStyle(color: Colors.grey)),
                ),
              ),
            ),

            // Page content
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (index) => setState(() => _currentPage = index),
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: slide.color.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(slide.icon, size: 56, color: slide.color),
                        ),
                        const SizedBox(height: 48),
                        Text(
                          slide.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            height: 1.3,
                            color: Color(0xFF2C3E50),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          slide.subtitle,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15,
                            color: Colors.grey[600],
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Dots + Button
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  // Page indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (index) {
                      final isActive = index == _currentPage;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: isActive ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: isActive ? const Color(0xFFFF6B35) : Colors.grey[300],
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 32),
                  // Action button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_currentPage == _slides.length - 1) {
                          _completeOnboarding();
                        } else {
                          _controller.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF6B35),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: Text(
                        _currentPage == _slides.length - 1 ? 'Mulai Sekarang' : 'Lanjut',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlideData {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;

  const _SlideData({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });
}
