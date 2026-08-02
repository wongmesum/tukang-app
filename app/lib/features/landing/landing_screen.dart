import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/premium_icons.dart';
import '../../core/theme.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  static const _categories = [
    ('AC', 'AC'),
    ('BGN', 'Bangunan'),
    ('LST', 'Listrik'),
    ('PLB', 'Pipa'),
    ('CAT', 'Cat'),
    ('CLN', 'Cleaning'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.l),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: AppSpacing.xl),
              _buildHeader(context),
              const SizedBox(height: AppSpacing.xxl),
              _HeroCard(),
              const SizedBox(height: AppSpacing.xxl),
              _buildValueProps(context),
              const SizedBox(height: AppSpacing.xxl),
              _buildCategoryPreview(context),
              const SizedBox(height: AppSpacing.xxl),
              _buildTrustStrip(context),
              const SizedBox(height: AppSpacing.xxl),
              _buildCta(context),
              const SizedBox(height: AppSpacing.xxl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        PremiumCategoryIcon(
          icon: PremiumServiceIcon.generic,
          size: 48,
        ),
        const SizedBox(width: AppSpacing.m),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'TukangNDeso',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.4,
                    ),
              ),
              const Text('Jasa tukang lokal Mojokerto'),
            ],
          ),
        ),
        TextButton(
          onPressed: () => context.go('/auth/phone'),
          child: const Text('Masuk'),
        ),
      ],
    );
  }

  Widget _buildValueProps(BuildContext context) {
    return Column(
      children: const [
        _ValueProp(
          icon: Icons.verified_user_outlined,
          title: 'Tukang terverifikasi',
          description: 'Profil, keahlian, dan status pekerja dicek sebelum aktif.',
        ),
        SizedBox(height: AppSpacing.m),
        _ValueProp(
          icon: Icons.payments_outlined,
          title: 'Harga transparan',
          description: 'Estimasi jelas sebelum order: tarif, jarak, dan surcharge.',
        ),
        SizedBox(height: AppSpacing.m),
        _ValueProp(
          icon: Icons.near_me_outlined,
          title: 'Cepat di area terdekat',
          description: 'Matching ke tukang terdekat sesuai kategori layanan.',
        ),
      ],
    );
  }

  Widget _buildCategoryPreview(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Kategori populer',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: AppSpacing.l),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _categories.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            crossAxisSpacing: AppSpacing.m,
            mainAxisSpacing: AppSpacing.m,
            childAspectRatio: 0.95,
          ),
          itemBuilder: (context, index) {
            final item = _categories[index];
            return _CategoryPreviewTile(code: item.$1, label: item.$2);
          },
        ),
      ],
    );
  }

  Widget _buildTrustStrip(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.l),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.medium),
        border: Border.all(color: AppColors.line),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _StatItem(value: '9', label: 'Kategori'),
          _StatItem(value: 'QRIS', label: 'Pembayaran'),
          _StatItem(value: '24/7', label: 'Bantuan'),
        ],
      ),
    );
  }

  Widget _buildCta(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton(
          onPressed: () => context.go('/auth/phone'),
          child: const Text('Cari Tukang Sekarang'),
        ),
        const SizedBox(height: AppSpacing.m),
        OutlinedButton(
          onPressed: () => context.go('/auth/phone'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.m),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
          ),
          child: const Text('Daftar Jadi Tukang'),
        ),
      ],
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFF875E), AppColors.primary, Color(0xFFC9552B)],
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.28),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.m,
              vertical: AppSpacing.s,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.18),
              borderRadius: BorderRadius.circular(AppRadius.pill),
              border: Border.all(color: Colors.white24),
            ),
            child: const Text(
              'Mojokerto Kabupaten',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'Cari tukang terpercaya di Mojokerto',
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  color: Colors.white,
                  fontSize: 34,
                  height: 1.05,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: AppSpacing.m),
          Text(
            'Booking tukang AC, listrik, pipa, bangunan, dan layanan rumah lain dengan harga transparan.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.white.withOpacity(0.86),
                  height: 1.45,
                ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Row(
            children: const [
              PremiumCategoryIcon(icon: PremiumServiceIcon.ac, size: 50),
              SizedBox(width: AppSpacing.s),
              PremiumCategoryIcon(icon: PremiumServiceIcon.electric, size: 50),
              SizedBox(width: AppSpacing.s),
              PremiumCategoryIcon(icon: PremiumServiceIcon.plumbing, size: 50),
              SizedBox(width: AppSpacing.s),
              PremiumCategoryIcon(icon: PremiumServiceIcon.building, size: 50),
            ],
          ),
        ],
      ),
    );
  }
}

class _ValueProp extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _ValueProp({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.l),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.medium),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary),
          ),
          const SizedBox(width: AppSpacing.m),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(description),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryPreviewTile extends StatelessWidget {
  final String code;
  final String label;

  const _CategoryPreviewTile({required this.code, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.m),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.medium),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          PremiumCategoryIcon.fromCode(code: code, size: 46),
          const SizedBox(height: AppSpacing.s),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;

  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w900,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
