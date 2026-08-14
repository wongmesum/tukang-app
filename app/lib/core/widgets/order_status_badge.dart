import 'package:flutter/material.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';

/// Order status badge with color coding
class OrderStatusBadge extends StatelessWidget {
  const OrderStatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final config = _getStatusConfig(status);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: config.color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(AppSpacing.base),
        border: Border.all(color: config.color.withOpacity(0.3)),
      ),
      child: Text(
        config.label,
        style: TextStyle(
          color: config.color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  _StatusConfig _getStatusConfig(String status) {
    return switch (status.toUpperCase()) {
      'PENDING' => _StatusConfig('Menunggu', AppColors.statusPending),
      'MATCHED' => _StatusConfig('Tukang Ditemukan', AppColors.statusMatched),
      'ACCEPTED' => _StatusConfig('Diterima', AppColors.statusAccepted),
      'EN_ROUTE' => _StatusConfig('Dalam Perjalanan', AppColors.statusEnRoute),
      'ARRIVED' => _StatusConfig('Tiba di Lokasi', AppColors.statusArrived),
      'IN_PROGRESS' => _StatusConfig('Sedang Dikerjakan', AppColors.statusInProgress),
      'COMPLETED' => _StatusConfig('Selesai', AppColors.statusCompleted),
      'PAID' => _StatusConfig('Dibayar', AppColors.statusPaid),
      'REVIEWED' => _StatusConfig('Selesai', AppColors.statusPaid),
      'EXPIRED' => _StatusConfig('Kadaluarsa', AppColors.statusCancelled),
      'CANCELLED_BY_CUSTOMER' => _StatusConfig('Dibatalkan', AppColors.statusCancelled),
      'CANCELLED_BY_WORKER' => _StatusConfig('Dibatalkan Tukang', AppColors.statusCancelled),
      'DISPUTED' => _StatusConfig('Sengketa', AppColors.statusDisputed),
      _ => _StatusConfig(status, AppColors.textSecondary),
    };
  }
}

class _StatusConfig {
  const _StatusConfig(this.label, this.color);
  final String label;
  final Color color;
}
