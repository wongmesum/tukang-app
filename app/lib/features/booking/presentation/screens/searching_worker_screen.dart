import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
  Timer? _navigationTimer;
  bool _noWorkerFound = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    // The server runs matching during order creation and returns the outcome,
    // so the result is already known — no polling needed.
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolveMatch());
  }

  void _resolveMatch() {
    final state = ref.read(bookingProvider);

    if (state.noWorkerAvailable || state.createdOrderId == null) {
      setState(() => _noWorkerFound = true);
      return;
    }

    // Brief pause so the animation doesn't flash past. Matching is instant,
    // but jumping straight through feels like a skipped step.
    _navigationTimer = Timer(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      context.go('/orders/${state.createdOrderId}/tracking');
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    _navigationTimer?.cancel();
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
              children: _noWorkerFound
                  ? _buildNoWorkerState(context)
                  : _buildSearchingState(),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSearchingState() {
    return [
      RotationTransition(
        turns: _animController,
        child: const Icon(Icons.search, size: 64, color: AppColors.primary),
      ),
      const SizedBox(height: AppSpacing.lg),
      Text(
        'Mencari Tukang Terdekat...',
        style: AppTypography.h3,
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: AppSpacing.md),
      Text(
        'Kami sedang mencarikan tukang terbaik untuk Anda',
        style: AppTypography.body2,
        textAlign: TextAlign.center,
      ),
    ];
  }

  List<Widget> _buildNoWorkerState(BuildContext context) {
    return [
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
        'Maaf, saat ini tidak ada tukang yang tersedia di area Anda. '
        'Order Anda tetap tersimpan dan akan kami carikan tukang begitu ada yang tersedia.',
        style: AppTypography.body2,
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: AppSpacing.xl),
      ElevatedButton(
        onPressed: () {
          final orderId = ref.read(bookingProvider).createdOrderId;
          if (orderId != null) {
            context.go('/orders/$orderId/tracking');
          } else {
            context.go('/home');
          }
        },
        child: const Text('Lihat Status Order'),
      ),
      const SizedBox(height: AppSpacing.sm),
      TextButton(
        onPressed: () => context.go('/home'),
        child: const Text('Kembali ke Beranda'),
      ),
    ];
  }
}
