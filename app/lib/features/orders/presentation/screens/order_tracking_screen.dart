import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/constants/app_constants.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/widgets/order_status_badge.dart';
import 'package:tukangndeso/core/widgets/worker_card.dart';
import 'package:tukangndeso/features/orders/presentation/providers/orders_provider.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderTrackingScreen> createState() =>
      _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  void _startPolling() {
    // Fetch immediately
    ref.read(orderDetailProvider(widget.orderId).notifier).refresh();

    // Then poll periodically
    _pollingTimer = Timer.periodic(
      const Duration(milliseconds: AppConstants.orderPollingMs),
      (_) {
        final state = ref.read(orderDetailProvider(widget.orderId));
        // Stop polling if terminal state
        if (state.value != null && _isTerminalStatus(state.value!.status)) {
          _pollingTimer?.cancel();
          return;
        }
        ref.read(orderDetailProvider(widget.orderId).notifier).refresh();
      },
    );
  }

  bool _isTerminalStatus(String status) {
    const terminals = ['REVIEWED', 'EXPIRED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_WORKER', 'DISPUTED'];
    return terminals.contains(status);
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(orderDetailProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Tracking Order')),
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
                // Order Number & Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('#${order.orderNumber}', style: AppTypography.h4),
                    OrderStatusBadge(status: order.status),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),

                // Worker info (if matched)
                if (order.workerName != null) ...[
                  Text('Tukang Anda', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.sm),
                  WorkerCard(
                    name: order.workerName!,
                    ratingAvg: order.workerRating ?? 0,
                    totalOrders: order.workerTotalOrders ?? 0,
                    distanceKm: order.distanceKm,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // Status timeline
                _StatusTimeline(status: order.status),

                const SizedBox(height: AppSpacing.lg),

                // Actions based on status
                if (order.status == 'COMPLETED')
                  ElevatedButton(
                    onPressed: () => context.push('/orders/${widget.orderId}/pay'),
                    child: const Text('Bayar Sekarang'),
                  ),

                if (order.status == 'PAID')
                  ElevatedButton(
                    onPressed: () => context.push('/orders/${widget.orderId}/review'),
                    child: const Text('Beri Rating'),
                  ),

                if (['PENDING', 'MATCHED'].contains(order.status))
                  OutlinedButton(
                    onPressed: () => _cancelOrder(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.danger),
                    ),
                    child: const Text('Batalkan Order'),
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

  void _cancelOrder(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Batalkan Order?'),
        content: const Text('Apakah Anda yakin ingin membatalkan order ini?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tidak'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(orderDetailProvider(widget.orderId).notifier).cancel('Berubah pikiran');
            },
            child: const Text('Ya, Batalkan', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }
}

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({required this.status});

  final String status;

  static const _steps = [
    ('PENDING', 'Order Dibuat', Icons.receipt_long),
    ('MATCHED', 'Tukang Ditemukan', Icons.person_search),
    ('ACCEPTED', 'Tukang Menerima', Icons.check_circle),
    ('EN_ROUTE', 'Dalam Perjalanan', Icons.directions_walk),
    ('ARRIVED', 'Tukang Tiba', Icons.location_on),
    ('IN_PROGRESS', 'Sedang Dikerjakan', Icons.build),
    ('COMPLETED', 'Selesai', Icons.done_all),
    ('PAID', 'Dibayar', Icons.payment),
  ];

  int get _currentIndex => _steps.indexWhere((s) => s.$1 == status);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(_steps.length, (index) {
        final step = _steps[index];
        final isCompleted = index <= _currentIndex;
        final isCurrent = index == _currentIndex;

        return _TimelineStep(
          label: step.$2,
          icon: step.$3,
          isCompleted: isCompleted,
          isCurrent: isCurrent,
          isLast: index == _steps.length - 1,
        );
      }),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.label,
    required this.icon,
    required this.isCompleted,
    required this.isCurrent,
    required this.isLast,
  });

  final String label;
  final IconData icon;
  final bool isCompleted;
  final bool isCurrent;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = isCompleted ? AppColors.success : AppColors.border;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isCurrent ? AppColors.primary : color,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 16, color: Colors.white),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 32,
                color: color,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
              color: isCompleted ? AppColors.textPrimary : AppColors.textHint,
            ),
          ),
        ),
      ],
    );
  }
}
