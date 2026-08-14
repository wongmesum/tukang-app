import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/widgets/price_breakdown_card.dart';
import 'package:tukangndeso/features/booking/presentation/providers/booking_provider.dart';

class PriceEstimateScreen extends ConsumerStatefulWidget {
  const PriceEstimateScreen({super.key});

  @override
  ConsumerState<PriceEstimateScreen> createState() => _PriceEstimateScreenState();
}

class _PriceEstimateScreenState extends ConsumerState<PriceEstimateScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch estimate when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(bookingProvider.notifier).fetchEstimate();
    });
  }

  Future<void> _submitOrder() async {
    final success = await ref.read(bookingProvider.notifier).submitOrder();
    if (!mounted) return;

    if (success) {
      context.push(Routes.searchingWorker);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bookingProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Estimasi Harga')),
      body: state.isLoading && state.estimate == null
          ? const Center(child: CircularProgressIndicator())
          : state.estimate == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.danger),
                      const SizedBox(height: 16),
                      Text(
                        state.errorMessage ?? 'Gagal menghitung estimasi',
                        style: AppTypography.body1,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => ref.read(bookingProvider.notifier).fetchEstimate(),
                        child: const Text('Coba Lagi'),
                      ),
                    ],
                  ),
                )
              : Padding(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  child: Column(
                    children: [
                      Expanded(
                        child: SingleChildScrollView(
                          child: Column(
                            children: [
                              PriceBreakdownCard(
                                baseRate: state.estimate!.baseRate,
                                travelCost: state.estimate!.travelCost,
                                distanceKm: state.estimate!.distanceKm,
                                totalEstimate: state.estimate!.totalEstimate,
                                surchargeHoliday: state.estimate!.surchargeHoliday,
                                surchargeNight: state.estimate!.surchargeNight,
                                surchargeWeekend: state.estimate!.surchargeWeekend,
                                surchargeUrgent: state.estimate!.surchargeUrgent,
                                surchargeFloor: state.estimate!.surchargeFloor,
                                duration: state.duration,
                                pricingScheme: state.pricingScheme,
                              ),
                              const SizedBox(height: AppSpacing.base),
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(AppSpacing.md),
                                  child: Row(
                                    children: [
                                      const Icon(
                                        Icons.info_outline,
                                        color: AppColors.info,
                                        size: 20,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Harga final mungkin berbeda jika durasi aktual berbeda dari estimasi.',
                                          style: AppTypography.caption,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (state.errorMessage != null) ...[
                        Text(
                          state.errorMessage!,
                          style: const TextStyle(color: AppColors.danger),
                        ),
                        const SizedBox(height: 8),
                      ],
                      ElevatedButton(
                        onPressed: state.isLoading ? null : _submitOrder,
                        child: state.isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Cari Tukang'),
                      ),
                    ],
                  ),
                ),
    );
  }
}
