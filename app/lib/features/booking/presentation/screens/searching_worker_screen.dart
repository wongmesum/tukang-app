import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/constants/app_constants.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/features/booking/presentation/providers/booking_provider.dart';

class SearchingWorkerScreen extends ConsumerStatefulWidget {
  const SearchingWorkerScreen({super.key});

  @override
  ConsumerState<SearchingWorkerScreen> createState() =>
      _SearchingWorkerScreenState();
}

class _SearchingWorkerScreenState extends ConsumerState<SearchingWorkerScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  Timer? _timeoutTimer;
  int _secondsElapsed = 0;
  bool _timedOut = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _timeoutTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() => _secondsElapsed++);
      if (_secondsElapsed >= AppConstants.matchingTimeoutSeconds) {
        timer.cancel();
        setState(() => _timedOut = true);
      }
    });

    // In a real app, poll order status here
    // For MVP, simulate matching then navigate to tracking
    _simulateMatching();
  }

  Future<void> _simulateMatching() async {
    await Future.delayed(const Duration(seconds: 5));
    if (!mounted || _timedOut) return;

    final state = ref.read(bookingProvider);
    if (state.createdOrderId != null) {
      context.go('/orders/${state.createdOrderId}/tracking');
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    _timeoutTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (!_timedOut) ...[
                  RotationTransition(
                    turns: _animController,
                    child: const Icon(
                      Icons.search,
                      size: 64,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'Mencari Tukang Terdekat...',
                    style: AppTypography.h3,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Mohon tunggu, kami sedang mencarikan tukang terbaik untuk Anda',
                    style: AppTypography.body2,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    '${_secondsElapsed}s',
                    style: AppTypography.timer.copyWith(color: AppColors.textSecondary),
                  ),
                ] else ...[
                  const Icon(
                    Icons.sentiment_dissatisfied,
                    size: 64,
                    color: AppColors.warning,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    'Tukang Tidak Tersedia',
                    style: AppTypography.h3,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Maaf, saat ini tidak ada tukang yang tersedia di area Anda. Silakan coba lagi nanti.',
                    style: AppTypography.body2,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  ElevatedButton(
                    onPressed: () => context.go('/home'),
                    child: const Text('Kembali ke Beranda'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
