import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/widgets/rating_stars.dart';
import 'package:tukangndeso/services/api/dio_client.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';

class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  int _rating = 0;
  final _commentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih rating bintang terlebih dahulu')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.post(ApiEndpoints.reviewOrder(widget.orderId), data: {
        'rating': _rating,
        'comment': _commentController.text.trim().isNotEmpty
            ? _commentController.text.trim()
            : null,
      });

      if (!mounted) return;

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Terima Kasih! 🙏'),
          content: const Text('Review Anda membantu meningkatkan kualitas layanan.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                context.go(Routes.home);
              },
              child: const Text('Kembali ke Beranda'),
            ),
          ],
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal mengirim review. Coba lagi.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Beri Rating')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: AppSpacing.xl),
            const Icon(Icons.star_outline, size: 64, color: AppColors.warning),
            const SizedBox(height: AppSpacing.base),
            Text(
              'Bagaimana pengalaman Anda?',
              style: AppTypography.h3,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Rating Anda sangat berarti bagi tukang',
              style: AppTypography.body2,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            RatingStars(
              rating: _rating,
              onChanged: (value) => setState(() => _rating = value),
              size: 48,
              interactive: true,
            ),
            const SizedBox(height: 8),
            Text(
              _ratingLabel,
              style: AppTypography.body2.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            TextFormField(
              controller: _commentController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Tulis komentar (opsional)...',
                border: OutlineInputBorder(),
              ),
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Kirim Review'),
            ),
            const SizedBox(height: AppSpacing.base),
            TextButton(
              onPressed: () => context.go(Routes.home),
              child: const Text('Lewati'),
            ),
          ],
        ),
      ),
    );
  }

  String get _ratingLabel => switch (_rating) {
        1 => 'Sangat Buruk 😞',
        2 => 'Kurang Baik 😐',
        3 => 'Cukup 🙂',
        4 => 'Baik 😊',
        5 => 'Sangat Memuaskan! 🤩',
        _ => '',
      };
}
