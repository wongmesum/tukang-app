import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/utils/formatters.dart';
import 'package:tukangndeso/core/widgets/order_status_badge.dart';
import 'package:tukangndeso/core/widgets/price_breakdown_card.dart';
import 'package:tukangndeso/features/orders/presentation/providers/orders_provider.dart';

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(orderDetailProvider(orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Detail Order')),
      body: orderAsync.when(
        data: (order) {
          if (order == null) {
            return const Center(child: Text('Order tidak ditemukan'));
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.base),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('#${order.orderNumber}', style: AppTypography.h3),
                    OrderStatusBadge(status: order.status),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                Text('Tanggal: ${Formatters.dateTime(order.createdAt)}', style: AppTypography.body2),
                if (order.description != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Text('Catatan:', style: AppTypography.h4),
                  Text(order.description!, style: AppTypography.body2),
                ],
                const SizedBox(height: AppSpacing.lg),
                if (order.pricing != null)
                  PriceBreakdownCard(
                    baseRate: order.pricing!.baseRate,
                    travelCost: order.pricing!.travelCost,
                    distanceKm: order.pricing!.distanceKm,
                    totalEstimate: order.pricing!.totalEstimate,
                    surchargeHoliday: order.pricing!.surchargeHoliday,
                    surchargeNight: order.pricing!.surchargeNight,
                    surchargeWeekend: order.pricing!.surchargeWeekend,
                    surchargeUrgent: order.pricing!.surchargeUrgent,
                    surchargeFloor: order.pricing!.surchargeFloor,
                  ),
                const SizedBox(height: AppSpacing.lg),
                // Navigate to tracking if order is active
                if (!['REVIEWED', 'EXPIRED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_WORKER'].contains(order.status))
                  ElevatedButton(
                    onPressed: () => context.push('/orders/$orderId/tracking'),
                    child: const Text('Lihat Tracking'),
                  ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
