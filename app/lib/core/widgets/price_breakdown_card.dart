import 'package:flutter/material.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/utils/formatters.dart';

/// Reusable PriceBreakdownCard — shows tariff breakdown
class PriceBreakdownCard extends StatelessWidget {
  const PriceBreakdownCard({
    super.key,
    required this.baseRate,
    required this.travelCost,
    required this.distanceKm,
    required this.totalEstimate,
    this.surchargeHoliday = 0,
    this.surchargeNight = 0,
    this.surchargeWeekend = 0,
    this.surchargeUrgent = 0,
    this.surchargeFloor = 0,
    this.duration,
    this.pricingScheme,
  });

  final int baseRate;
  final int travelCost;
  final double distanceKm;
  final int totalEstimate;
  final int surchargeHoliday;
  final int surchargeNight;
  final int surchargeWeekend;
  final int surchargeUrgent;
  final int surchargeFloor;
  final int? duration;
  final String? pricingScheme;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Rincian Harga', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.md),
            _buildRow(
              'Tarif Dasar${_durationLabel}',
              Formatters.rupiah(baseRate),
            ),
            _buildRow(
              'Ongkos Jalan (${distanceKm.toStringAsFixed(1)} km)',
              Formatters.rupiah(travelCost),
            ),
            if (surchargeHoliday > 0)
              _buildRow('Hari Libur (+50%)', Formatters.rupiah(surchargeHoliday)),
            if (surchargeNight > 0)
              _buildRow('Malam (+30%)', Formatters.rupiah(surchargeNight)),
            if (surchargeWeekend > 0)
              _buildRow('Weekend (+20%)', Formatters.rupiah(surchargeWeekend)),
            if (surchargeUrgent > 0)
              _buildRow('Urgent', Formatters.rupiah(surchargeUrgent)),
            if (surchargeFloor > 0)
              _buildRow('Lantai Tinggi', Formatters.rupiah(surchargeFloor)),
            const Divider(height: 24),
            _buildRow(
              'Total Estimasi',
              Formatters.rupiah(totalEstimate),
              isBold: true,
            ),
          ],
        ),
      ),
    );
  }

  String get _durationLabel {
    if (duration == null || pricingScheme == null) return '';
    return ' (${Formatters.duration(duration!, pricingScheme!)})';
  }

  Widget _buildRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: isBold
                ? AppTypography.body1.copyWith(fontWeight: FontWeight.w600)
                : AppTypography.body2,
          ),
          Text(
            value,
            style: isBold
                ? AppTypography.price.copyWith(color: AppColors.primary)
                : AppTypography.body1,
          ),
        ],
      ),
    );
  }
}
