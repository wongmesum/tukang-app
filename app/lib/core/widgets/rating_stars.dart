import 'package:flutter/material.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';

/// Interactive rating stars widget (1-5)
class RatingStars extends StatelessWidget {
  const RatingStars({
    super.key,
    required this.rating,
    this.onChanged,
    this.size = 32,
    this.interactive = false,
  });

  final int rating;
  final ValueChanged<int>? onChanged;
  final double size;
  final bool interactive;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        final starNumber = index + 1;
        final isFilled = starNumber <= rating;

        return GestureDetector(
          onTap: interactive ? () => onChanged?.call(starNumber) : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Icon(
              isFilled ? Icons.star : Icons.star_border,
              color: isFilled ? AppColors.warning : AppColors.textHint,
              size: size,
            ),
          ),
        );
      }),
    );
  }
}
