import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/theme.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  Map<String, dynamic>? _user;
  List<dynamic> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final profileRes = await dio.get<Map<String, dynamic>>('/v1/me');
      final ordersRes = await dio.get<Map<String, dynamic>>('/v1/orders');

      setState(() {
        _user = profileRes.data?['data'] as Map<String, dynamic>?;
        _orders = (ordersRes.data?['data'] as List<dynamic>?) ?? [];
      });
    } on Exception catch (_) {
      // Graceful fallback
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final name = _user?['name'] as String? ?? 'Pengguna';
    final phone = _user?['phone'] as String? ?? '';
    final role = _user?['role'] as String? ?? 'customer';

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.l),
        children: [
          // Avatar & name
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: AppColors.primary.withOpacity(0.12),
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : 'U',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.m),
                Text(name, style: Theme.of(context).textTheme.titleLarge),
                Text(phone, style: const TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),

          // Menu items
          _MenuItem(
            icon: Icons.history,
            title: 'Riwayat Order',
            subtitle: '${_orders.length} order',
            onTap: () => context.push('/profile/orders'),
          ),
          _MenuItem(
            icon: Icons.location_on_outlined,
            title: 'Alamat Saya',
            onTap: () => context.push('/profile/addresses'),
          ),
          if (role == 'worker')
            _MenuItem(
              icon: Icons.dashboard_outlined,
              title: 'Dashboard Tukang',
              onTap: () => context.go('/worker/dashboard'),
            ),
          if (role == 'customer')
            _MenuItem(
              icon: Icons.handyman_outlined,
              title: 'Daftar Jadi Tukang',
              onTap: () => context.push('/worker/register'),
            ),
          _MenuItem(
            icon: Icons.help_outline,
            title: 'Bantuan',
            onTap: () {},
          ),
          const SizedBox(height: AppSpacing.xl),
          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(authTokenProvider.notifier).clear();
            },
            icon: const Icon(Icons.logout, color: AppColors.danger),
            label: const Text('Keluar', style: TextStyle(color: AppColors.danger)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.danger),
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.m),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({
    required this.icon,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.m),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(AppRadius.small),
          ),
          child: Icon(icon, color: AppColors.primary, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: subtitle != null ? Text(subtitle!) : null,
        trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
        onTap: onTap,
      ),
    );
  }
}
