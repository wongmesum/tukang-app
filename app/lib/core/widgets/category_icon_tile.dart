import 'package:flutter/material.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';

/// Reusable category grid tile with icon
class CategoryIconTile extends StatelessWidget {
  const CategoryIconTile({
    super.key,
    required this.code,
    required this.name,
    required this.onTap,
    this.iconUrl,
  });

  final String code;
  final String name;
  final String? iconUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppSpacing.md),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppSpacing.sm),
              ),
              child: Icon(
                _getCategoryIcon(code),
                color: AppColors.primary,
                size: 28,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String code) {
    return switch (code.toUpperCase()) {
      'AC' => Icons.ac_unit,
      'BGN' => Icons.home_repair_service,
      'LST' => Icons.electrical_services,
      'PLB' => Icons.plumbing,
      'LAS' => Icons.construction,
      'TKY' => Icons.carpenter,
      'CLN' => Icons.cleaning_services,
      'CAT' => Icons.format_paint,
      'TNM' => Icons.grass,
      _ => Icons.build,
    };
  }
}
