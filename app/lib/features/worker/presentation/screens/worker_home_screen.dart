import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/utils/formatters.dart';
import 'package:tukangndeso/features/worker/presentation/providers/worker_provider.dart';

class WorkerHomeScreen extends ConsumerWidget {
  const WorkerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workerState = ref.watch(workerProvider);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.base),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Dashboard Tukang', style: AppTypography.h3),
                      const SizedBox(height: 4),
                      Text(
                        workerState.isAvailable ? '🟢 Online' : '🔴 Offline',
                        style: AppTypography.body2.copyWith(
                          color: workerState.isAvailable
                              ? AppColors.success
                              : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => context.push(Routes.workerWallet),
                    icon: const Icon(Icons.account_balance_wallet),
                    color: AppColors.primary,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Online/Offline Toggle
              SwitchListTile(
                title: const Text('Status Online'),
                subtitle: Text(
                  workerState.isAvailable
                      ? 'Anda akan menerima order masuk'
                      : 'Aktifkan untuk menerima order',
                ),
                value: workerState.isAvailable,
                onChanged: (value) {
                  ref.read(workerProvider.notifier).toggleAvailability(value);
                },
                activeColor: AppColors.success,
              ),

              const SizedBox(height: AppSpacing.lg),

              // Stats cards
              Row(
                children: [
                  _StatCard(
                    title: 'Saldo',
                    value: Formatters.rupiah(workerState.balance),
                    icon: Icons.account_balance_wallet,
                    color: AppColors.success,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  _StatCard(
                    title: 'Rating',
                    value: Formatters.rating(workerState.ratingAvg),
                    icon: Icons.star,
                    color: AppColors.warning,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  _StatCard(
                    title: 'Order Hari Ini',
                    value: '${workerState.todayOrders}',
                    icon: Icons.assignment,
                    color: AppColors.info,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  _StatCard(
                    title: 'Total Order',
                    value: '${workerState.totalOrders}',
                    icon: Icons.done_all,
                    color: AppColors.primary,
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.lg),

              // Quick actions
              Text('Menu', style: AppTypography.h4),
              const SizedBox(height: AppSpacing.md),
              _MenuTile(
                icon: Icons.notifications_active,
                title: 'Order Masuk',
                subtitle: 'Lihat order yang menunggu',
                onTap: () => context.push(Routes.workerIncoming),
              ),
              _MenuTile(
                icon: Icons.account_balance_wallet,
                title: 'Dompet',
                subtitle: 'Saldo & riwayat transaksi',
                onTap: () => context.push(Routes.workerWallet),
              ),
              _MenuTile(
                icon: Icons.person,
                title: 'Profil',
                subtitle: 'Edit keahlian & radius kerja',
                onTap: () {}, // TODO: navigate to worker profile
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.base),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(AppSpacing.md),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(value, style: AppTypography.h4),
            Text(title, style: AppTypography.caption),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title),
        subtitle: Text(subtitle, style: AppTypography.caption),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
